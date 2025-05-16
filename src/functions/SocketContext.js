import React, { createContext, useContext, useEffect } from "react";
import { useSocketConnection } from "./SocketConnection";

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  // Determine environment based on hostname
  const environment =
    window.location.hostname === "localhost" ? "local" : "production";

  // Initialize socket connection
  const socket = useSocketConnection(environment, (data) => {
    // Handle any global socket data here if needed
    console.log("Global socket data received:", data);
  });

  return (
    <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
};
