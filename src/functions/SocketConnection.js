import { useState, useEffect, useCallback, useRef } from "react";
import { useSerial } from "./SerialDataContext";

const SOCKET_URLS = {
  local: "ws://localhost:3103",
  production: "wss://play-machine-server.noshado.ws"
};

const MAX_RETRIES = 5;
const INITIAL_RETRY_DELAY = 1000; // 1 second

export const useSocketConnection = (
  environment = "local",
  onMessage,
  initialShouldConnect = true
) => {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [shouldConnect, setShouldConnect] = useState(initialShouldConnect);
  const socketRef = useRef(null);
  const isConnectedRef = useRef(false);
  const latestSerialDataRef = useRef(null);
  const setSerialDataRef = useRef(null);
  const hardwareStateAtSetSerialDataRef = useRef(null);
  const { serialData, setSerialData } = useSerial();

  // Keep the refs updated with latest serial data
  useEffect(() => {
    // If we have setSerialData active, only update if hardware has changed significantly
    if (setSerialDataRef.current) {
      if (
        hardwareStateAtSetSerialDataRef.current &&
        JSON.stringify(serialData) !==
          JSON.stringify(hardwareStateAtSetSerialDataRef.current)
      ) {
        // Check if any hardware value has changed by more than 1 from its state
        // when we received the setSerialData event
        const hasSignificantHardwareChange = Object.keys(serialData).some(
          (key) => {
            const currentHardwareValue = serialData[key];
            const hardwareValueAtSetSerialData =
              hardwareStateAtSetSerialDataRef.current[key];
            // Only consider it a significant change if the difference is more than 1
            return (
              Math.abs(currentHardwareValue - hardwareValueAtSetSerialData) > 1
            );
          }
        );

        if (hasSignificantHardwareChange) {
          // Hardware has changed significantly from its state when we got setSerialData
          // Clear the set data and switch back to using hardware data
          setSerialDataRef.current = null;
          hardwareStateAtSetSerialDataRef.current = null;
          setSerialData(serialData);
        }
      }
    } else {
      // No setSerialData active, so just use hardware data
      latestSerialDataRef.current = serialData;
    }
  }, [serialData, setSerialData]);

  const sendMessage = useCallback((message) => {
    if (socketRef.current && isConnectedRef.current) {
      try {
        const data =
          typeof message === "string" ? message : JSON.stringify(message);
        socketRef.current.send(data);
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
      // Handle setSerialData events
      if (data.action === "setSerialData") {
        // Access the nested data structure correctly
        const serialDataValues = data.data.data;
        setSerialDataRef.current = serialDataValues;
        // Store the current hardware state when we receive setSerialData
        hardwareStateAtSetSerialDataRef.current = JSON.parse(
          JSON.stringify(serialData)
        );
        setSerialData(serialDataValues);
      }

      // Handle getSerialData requests
      if (data.action === "getSerialData") {
        // Always use setSerialData if available, otherwise use latest serial data
        const dataToSend =
          setSerialDataRef.current || latestSerialDataRef.current;

        sendMessage({
          action: "serialData",
          data: dataToSend,
          isFromSelf: true
        });
      }

      // Always call the onMessage handler if provided
      onMessage?.(data);
    },
    [sendMessage, onMessage, setSerialData, serialData]
  );

  const connect = useCallback(() => {
    if (socketRef.current || !shouldConnect) {
      return;
    }

    try {
      const ws = new WebSocket(SOCKET_URLS[environment]);
      socketRef.current = ws;

      ws.onopen = () => {
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
        console.error(
          "WebSocket error for",
          SOCKET_URLS[environment],
          ":",
          error
        );
        setError("Connection error");
      };

      ws.onclose = (event) => {
        isConnectedRef.current = false;
        setIsConnected(false);
        socketRef.current = null;

        if (shouldConnect && retryCount < MAX_RETRIES - 1) {
          const delay = INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
          setTimeout(() => {
            setRetryCount((prev) => prev + 1);
          }, delay);
        } else {
          setError(
            `Connection failed after ${MAX_RETRIES} attempts. Please check your connection and try again.`
          );
          setRetryCount(0);
          setShouldConnect(false);
        }
      };
    } catch (err) {
      console.error(
        "Failed to create WebSocket for",
        SOCKET_URLS[environment],
        ":",
        err
      );
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
