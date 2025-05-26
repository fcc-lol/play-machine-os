import { useState, useEffect, useCallback, useRef } from "react";
import { useSerial } from "./SerialDataContext";
import html2canvas from "html2canvas";
import hardware from "../config/Hardware.json";

const SOCKET_URLS = {
  local: "ws://localhost:3103",
  production: "wss://play-machine-server.noshado.ws"
};

const MAX_RETRIES = 5;
const INITIAL_RETRY_DELAY = 1000; // 1 second

const generateUniqueId = () => {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const captureScreen = async () => {
  const screenElement = document.getElementById("screen-container");
  if (!screenElement) return null;

  try {
    const canvas = await html2canvas(screenElement, {
      useCORS: true,
      allowTaint: true,
      backgroundColor: null,
      width: hardware.screen.width,
      height: hardware.screen.height,
      scale: 1
    });
    return canvas.toDataURL("image/png");
  } catch (error) {
    console.error("Failed to capture screen:", error);
    return null;
  }
};

const captureMultipleScreenshots = async (count, id, sendMessage) => {
  for (let i = 0; i < count; i++) {
    const screenshot = await captureScreen();
    if (screenshot) {
      sendMessage({
        action: "screenshotData",
        data: screenshot,
        id,
        index: i,
        total: count,
        isFromSelf: true
      });
    }
    // Wait 1 second before taking the next screenshot
    if (i < count - 1) {
      // Don't wait after the last screenshot
      await sleep(1000);
    }
  }
};

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
  const currentAppRef = useRef(null);
  const { serialData, setSerialData } = useSerial();

  // Keep the refs updated with latest serial data
  useEffect(() => {
    // Update the latest serial data reference
    latestSerialDataRef.current = serialData;
  }, [serialData]);

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
    async (data) => {
      // Handle setSerialData events
      if (data.action === "setSerialData") {
        // Access the nested data structure correctly
        const serialDataValues = data.data.data;
        // Use setSerialData which is actually setSerialDataFromSocket from the context
        setSerialData(serialDataValues.serialData || serialDataValues);
      }

      // Handle serialData events (from getSerialData response)
      if (data.action === "serialData") {
        const serialDataValues = data.data.serialData;
        setSerialData(serialDataValues);
      }

      // Handle appChanged events
      if (data.action === "appChanged") {
        currentAppRef.current = data.data.appId;
      }

      // Handle getCurrentApp requests
      if (data.action === "getCurrentApp") {
        sendMessage({
          action: "currentApp",
          data: { appId: currentAppRef.current },
          isFromSelf: true,
          broadcast: true
        });
      }

      // Handle getSerialData requests
      if (data.action === "getSerialData") {
        // Generate a unique ID for this request
        const id = generateUniqueId();

        // First send the serial data immediately
        sendMessage({
          action: "serialData",
          data: {
            serialData: latestSerialDataRef.current,
            currentApp: currentAppRef.current
          },
          id,
          isFromSelf: true
        });

        // Then capture 6 screenshots asynchronously
        captureMultipleScreenshots(6, id, sendMessage);
      }

      // Always call the onMessage handler if provided
      onMessage?.(data);
    },
    [sendMessage, onMessage, setSerialData, latestSerialDataRef]
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

  // Expose a setter for currentAppRef so the app can update it directly
  const setCurrentAppRef = (appId) => {
    currentAppRef.current = appId;
  };

  return {
    isConnected,
    error,
    sendMessage,
    connect: manualConnect,
    disconnect,
    // Expose setter
    setCurrentAppRef
  };
};
