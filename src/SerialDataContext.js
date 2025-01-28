import React, { createContext, useState, useContext } from "react";

const SerialDataContext = createContext();

export function SerialDataProvider({ children }) {
  const [serialData, setSerialData] = useState({});
  const [isConnected, setIsConnected] = useState(false);

  return (
    <SerialDataContext.Provider
      value={{ serialData, setSerialData, isConnected, setIsConnected }}
    >
      {children}
    </SerialDataContext.Provider>
  );
}

export function useSerial() {
  return useContext(SerialDataContext);
}
