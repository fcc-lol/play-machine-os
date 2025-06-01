import React, { createContext, useContext, useRef } from "react";
import { useSocketConnection } from "./SocketConnection";

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  // Keep track of registered message handlers
  const messageHandlers = useRef(new Set());
  // Keep track of registered outgoing message handlers
  const outgoingMessageHandlers = useRef(new Set());

  // Check if socket should be disabled via URL parameter
  const shouldDisableSocket =
    new URLSearchParams(window.location.search).get("useSocket") === "false";

  // Handle incoming messages and distribute to all registered handlers
  const handleMessage = (data) => {
    // Distribute the message to all handlers
    messageHandlers.current.forEach((handler) => {
      try {
        handler(data);
      } catch (error) {
        console.error("Error in socket message handler:", error);
      }
    });
  };

  // Handle outgoing messages and distribute to all registered handlers
  const handleOutgoingMessage = (message) => {
    outgoingMessageHandlers.current.forEach((handler) => {
      try {
        handler(message);
      } catch (error) {
        console.error("Error in outgoing socket message handler:", error);
      }
    });
  };

  // Initialize socket connection with outgoing message handler
  const socket = useSocketConnection(
    handleMessage,
    !shouldDisableSocket,
    handleOutgoingMessage
  );

  // Add registerHandler and registerOutgoingHandler to the context value
  const contextValue = {
    ...socket,
    registerHandler: (handler) => {
      messageHandlers.current.add(handler);
      return () => messageHandlers.current.delete(handler);
    },
    registerOutgoingHandler: (handler) => {
      outgoingMessageHandlers.current.add(handler);
      return () => outgoingMessageHandlers.current.delete(handler);
    }
  };

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
};
