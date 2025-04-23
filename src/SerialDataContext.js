import React, { createContext, useState, useContext, useEffect } from "react";

const SerialDataContext = createContext();

export function SerialDataProvider({ children }) {
  const [serialData, setSerialData] = useState({});
  const [isConnected, setIsConnected] = useState(false);
  const [isSimulatorMode, setIsSimulatorMode] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const onDevice = urlParams.get("onDevice");
    setIsSimulatorMode(onDevice === "false");

    // If in simulator mode, set initial connected state to true
    if (onDevice === "false") {
      setIsConnected(true);
    }
  }, []);

  return (
    <SerialDataContext.Provider
      value={{
        serialData,
        setSerialData,
        isConnected,
        setIsConnected,
        isSimulatorMode
      }}
    >
      {children}
    </SerialDataContext.Provider>
  );
}

export function useSerial() {
  return useContext(SerialDataContext);
}
