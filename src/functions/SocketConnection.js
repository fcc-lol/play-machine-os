import { useState, useEffect, useCallback, useRef } from "react";
import html2canvas from "html2canvas";
import hardware from "../config/Hardware.json";
import { API_URL, SOCKET_URL } from "../config/API";
import { getEnvironmentFromUrl } from "../utils/GetEnvironment";
import { convertSocketRemoteData } from "../utils/RemoteMapping";

const MAX_RETRIES = 5;
const INITIAL_RETRY_DELAY = 1000; // 1 second

// Get API key from URL query parameters
const getApiKeyFromUrl = () => {
  const params = new URLSearchParams(window.location.search);
  return params.get("apiKey");
};

const generateUniqueId = () => {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const useSocketConnection = (
  onMessage,
  initialShouldConnect = true,
  onOutgoingMessage = null,
  serialDataFunctions = null
) => {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [shouldConnect, setShouldConnect] = useState(initialShouldConnect);
  const [isApiKeyValid, setIsApiKeyValid] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [environment, setEnvironment] = useState(getEnvironmentFromUrl());

  const socketRef = useRef(null);
  const isConnectedRef = useRef(false);
  const latestSerialDataRef = useRef(null);
  const currentAppRef = useRef(null);
  const apiKeyRef = useRef(getApiKeyFromUrl());

  // Extract serial data functions from the passed parameter
  const { serialData, setSerialData, updateSerialData } =
    serialDataFunctions || {};

  // Define disconnect function first since it's used in the environment effect
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

  // Watch for URL parameter changes and update environment
  useEffect(() => {
    const checkEnvironment = () => {
      const newEnv = getEnvironmentFromUrl();
      if (newEnv !== environment) {
        setEnvironment(newEnv);
        // Disconnect and reconnect if environment changes
        if (socketRef.current) {
          disconnect();
        }
      }
    };

    // Check immediately
    checkEnvironment();

    // Set up a listener for URL changes
    const handleUrlChange = () => {
      checkEnvironment();
    };

    // Listen for popstate events (back/forward navigation)
    window.addEventListener("popstate", handleUrlChange);

    // Also check periodically for URL changes (in case of programmatic changes)
    const interval = setInterval(checkEnvironment, 1000);

    return () => {
      window.removeEventListener("popstate", handleUrlChange);
      clearInterval(interval);
    };
  }, [environment, disconnect]);

  // Keep the refs updated with latest serial data
  useEffect(() => {
    latestSerialDataRef.current = serialData;
  }, [serialData]);

  const captureScreen = useCallback(async () => {
    // Don't capture screen if API key is invalid
    if (!apiKeyRef.current) {
      console.error("Cannot capture screen - no API key provided");
      return null;
    }

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
  }, []);

  const captureMultipleScreenshots = useCallback(
    async (count, id, sendMessage, socketId) => {
      // Don't capture screenshots if API key is invalid
      if (!apiKeyRef.current) {
        console.error("Cannot capture screenshots - no API key provided");
        return;
      }

      for (let i = 0; i < count; i++) {
        const screenshot = await captureScreen();
        if (screenshot) {
          sendMessage({
            action: "screenshotData",
            data: screenshot,
            id,
            index: i,
            total: count,
            socketId
          });
        }
        // Wait 1 second before taking the next screenshot
        if (i < count - 1) {
          // Don't wait after the last screenshot
          await sleep(1000);
        }
      }
    },
    [captureScreen]
  );

  const sendMessage = useCallback(
    (message) => {
      if (!isApiKeyValid) {
        console.error("Cannot send message - API key is invalid");
        return;
      }

      if (socketRef.current && isConnectedRef.current) {
        try {
          // Add API key to all messages
          const messageWithApiKey = {
            ...(typeof message === "string" ? JSON.parse(message) : message),
            apiKey: apiKeyRef.current
          };

          // Call the outgoing message handler if provided
          if (onOutgoingMessage) {
            onOutgoingMessage(messageWithApiKey);
          }

          const data = JSON.stringify(messageWithApiKey);
          socketRef.current.send(data);
        } catch (err) {
          console.error("Failed to send message:", err);
          setError("Failed to send message");
        }
      } else {
        console.error("Cannot send message - socket not ready");
      }
    },
    [isApiKeyValid, onOutgoingMessage]
  );

  const handleIncomingMessage = useCallback(
    async (data) => {
      if (!isApiKeyValid || !apiKeyRef.current) {
        console.error("Cannot process message - API key is invalid or not set");
        return;
      }

      // Handle setSerialData events
      if (data.action === "setSerialData") {
        const serialDataValues = data.data.data;
        setSerialData(serialDataValues.serialData || serialDataValues);
      }

      // Handle remoteSerialData events
      if (data.action === "remoteSerialData") {
        const remoteData = convertSocketRemoteData(data);
        if (Object.keys(remoteData).length > 0) {
          // Update serial data through the updateSerialData function to ensure proper mapping
          updateSerialData(remoteData);
        }
      }

      // Handle remoteRegistration events
      if (data.action === "remoteRegistration") {
        // Pass the registration event to the serial data functions for auto-assignment
        if (
          serialDataFunctions &&
          serialDataFunctions.handleRemoteRegistration
        ) {
          serialDataFunctions.handleRemoteRegistration(data.data);
        }
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
          socketId: data.socketId
        });
      }

      // Handle getSerialData requests
      if (data.action === "getSerialData") {
        const responseId = generateUniqueId(); // Generate a single ID for both serialData and screenshots

        // First send the serial data immediately
        sendMessage({
          action: "serialData",
          data: {
            serialData: latestSerialDataRef.current,
            currentApp: currentAppRef.current
          },
          id: responseId,
          socketId: data.socketId,
          apiKey: apiKeyRef.current
        });

        // Then capture 6 screenshots asynchronously
        captureMultipleScreenshots(6, responseId, sendMessage, data.socketId);
      }

      // Handle getCurrentTheme events
      if (data.action === "getCurrentTheme") {
        const currentTheme = localStorage.getItem("theme") || "hacker"; // Default to hacker if no theme is stored
        sendMessage({
          action: "currentTheme",
          data: { theme: currentTheme },
          socketId: data.socketId
        });
      }

      // Always call the onMessage handler if provided
      onMessage?.(data);
    },
    [
      sendMessage,
      onMessage,
      setSerialData,
      updateSerialData,
      latestSerialDataRef,
      isApiKeyValid,
      captureMultipleScreenshots
    ]
  );

  const connect = useCallback(() => {
    if (!isApiKeyValid || !apiKeyRef.current) {
      console.error("Cannot connect - API key is invalid or not set");
      setError("Invalid or missing API key");
      return;
    }

    if (socketRef.current || !shouldConnect) {
      return;
    }

    try {
      const env = environment;
      const socketUrl = SOCKET_URL[env];
      if (!socketUrl) {
        throw new Error(`Invalid environment: ${env}`);
      }

      const ws = new WebSocket(socketUrl);
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
        console.error("WebSocket error for", socketUrl, ":", error);
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
        SOCKET_URL[environment],
        ":",
        err
      );
      setError("Connection failed");
      setShouldConnect(false);
    }
  }, [
    retryCount,
    handleIncomingMessage,
    shouldConnect,
    isApiKeyValid,
    environment
  ]);

  // Validate API key before allowing connection
  useEffect(() => {
    const validateApiKey = async () => {
      setIsValidating(true);
      const apiKey = apiKeyRef.current;
      const env = environment;

      if (!apiKey) {
        setIsApiKeyValid(false);
        setError("No API key provided");
        setIsValidating(false);
        return;
      }

      try {
        const validationUrl = `${API_URL[env]}/validate-api-key?apiKey=${apiKey}`;
        const response = await fetch(validationUrl);
        const data = await response.json();
        setIsApiKeyValid(data.valid);

        if (!data.valid) {
          setError("API key validation failed");
          if (socketRef.current) {
            disconnect();
          }
        } else {
          setError(null);
        }
      } catch (error) {
        console.error("Failed to validate API key:", error);
        setIsApiKeyValid(false);
        setError("Failed to validate API key - please check your connection");
        if (socketRef.current) {
          disconnect();
        }
      } finally {
        setIsValidating(false);
      }
    };

    validateApiKey();

    // Set up periodic revalidation every 5 minutes
    const revalidationInterval = setInterval(validateApiKey, 5 * 60 * 1000);

    return () => {
      clearInterval(revalidationInterval);
    };
  }, [disconnect, environment]);

  useEffect(() => {
    if (
      shouldConnect &&
      !socketRef.current &&
      !isConnected &&
      retryCount < MAX_RETRIES &&
      !isValidating &&
      isApiKeyValid
    ) {
      const timeout = setTimeout(
        () => {
          connect();
        },
        retryCount === 0 ? 0 : INITIAL_RETRY_DELAY * Math.pow(2, retryCount - 1)
      );

      return () => clearTimeout(timeout);
    }
  }, [
    connect,
    isConnected,
    retryCount,
    shouldConnect,
    isValidating,
    isApiKeyValid
  ]);

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
    setCurrentAppRef,
    isApiKeyValid,
    isValidating
  };
};
