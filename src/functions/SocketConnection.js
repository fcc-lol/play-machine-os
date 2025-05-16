import { useState, useEffect, useCallback, useRef } from "react";
import { useSerial } from "./SerialDataContext";

const SOCKET_URLS = {
  local: "ws://localhost:3103",
  production: "wss://play-machine-server.noshado.ws"
};

const MAX_RETRIES = 5;
const INITIAL_RETRY_DELAY = 1000; // 1 second

export const useSocketConnection = (environment = "local", onMessage) => {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [shouldConnect, setShouldConnect] = useState(true);
  const socketRef = useRef(null);
  const isConnectedRef = useRef(false);
  const latestSerialDataRef = useRef(null);
  const { serialData } = useSerial();

  // Keep the ref updated with latest serial data
  useEffect(() => {
    latestSerialDataRef.current = serialData;
  }, [serialData]);

  const sendMessage = useCallback((message) => {
    if (socketRef.current && isConnectedRef.current) {
      try {
        const data =
          typeof message === "string" ? message : JSON.stringify(message);
        socketRef.current.send(data);
        console.log("Message sent:", data);
      } catch (err) {
        console.error("Failed to send message:", err);
        setError("Failed to send message");
      }
    } else {
      console.error("Cannot send message - socket not ready");
    }
  }, []);

  const handleIncomingMessage = useCallback(
    (data) => {
      // Always call the onMessage handler if provided
      onMessage?.(data);

      // Handle getSerialData requests automatically
      if (data.action === "getSerialData") {
        sendMessage({
          action: "serialData",
          data: latestSerialDataRef.current
        });
      }
    },
    [sendMessage, onMessage]
  );

  const connect = useCallback(() => {
    if (socketRef.current || !shouldConnect) return;

    try {
      console.log(
        `Connecting to ${SOCKET_URLS[environment]} (Attempt ${
          retryCount + 1
        }/${MAX_RETRIES})`
      );
      const ws = new WebSocket(SOCKET_URLS[environment]);
      socketRef.current = ws;

      ws.onopen = () => {
        console.log("WebSocket connected");
        isConnectedRef.current = true;
        setIsConnected(true);
        setError(null);
        setRetryCount(0);
        setShouldConnect(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleIncomingMessage(data);
        } catch (err) {
          console.error("Failed to parse message:", err);
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        setError("Connection error");
      };

      ws.onclose = () => {
        console.log("WebSocket closed");
        isConnectedRef.current = false;
        setIsConnected(false);
        socketRef.current = null;

        if (shouldConnect && retryCount < MAX_RETRIES - 1) {
          const delay = INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
          console.log(
            `Retry attempt ${retryCount + 1}/${MAX_RETRIES} in ${delay}ms`
          );
          setTimeout(() => {
            setRetryCount((prev) => prev + 1);
          }, delay);
        } else {
          console.log(
            `Max retries (${MAX_RETRIES}) reached or connection stopped. Stopping reconnection attempts.`
          );
          setError(
            `Connection failed after ${MAX_RETRIES} attempts. Please check your connection and try again.`
          );
          setRetryCount(0);
          setShouldConnect(false);
        }
      };
    } catch (err) {
      console.error("Failed to create WebSocket:", err);
      setError("Connection failed");
      setShouldConnect(false);
    }
  }, [environment, retryCount, handleIncomingMessage, shouldConnect]);

  const disconnect = useCallback(() => {
    setShouldConnect(false);
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    isConnectedRef.current = false;
    setIsConnected(false);
    setRetryCount(0);
  }, []);

  useEffect(() => {
    if (
      shouldConnect &&
      !socketRef.current &&
      !isConnected &&
      retryCount < MAX_RETRIES
    ) {
      const timeout = setTimeout(
        () => {
          connect();
        },
        retryCount === 0 ? 0 : INITIAL_RETRY_DELAY * Math.pow(2, retryCount - 1)
      );

      return () => clearTimeout(timeout);
    }
  }, [connect, isConnected, retryCount, shouldConnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  const manualConnect = useCallback(() => {
    setShouldConnect(true);
    setRetryCount(0);
    setError(null);
  }, []);

  return {
    isConnected,
    error,
    sendMessage,
    connect: manualConnect,
    disconnect
  };
};
