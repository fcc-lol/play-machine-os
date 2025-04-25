import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useRef
} from "react";

const SerialDataContext = createContext();

export function SerialDataProvider({ children }) {
  const [serialData, setSerialData] = useState({});
  const [isInputConnected, setIsInputConnected] = useState(false);
  const [isOutputConnected, setIsOutputConnected] = useState(false);
  const [isSimulatorMode, setIsSimulatorMode] = useState(false);
  const writeToOutputDeviceRef = useRef(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const onDevice = urlParams.get("onDevice");
    setIsSimulatorMode(onDevice === "false");

    // If in simulator mode, set initial connected states to true
    if (onDevice === "false") {
      setIsInputConnected(true);
      setIsOutputConnected(true);
    }
  }, []);

  return (
    <SerialDataContext.Provider
      value={{
        serialData,
        setSerialData,
        isInputConnected,
        setIsInputConnected,
        isOutputConnected,
        setIsOutputConnected,
        isSimulatorMode,
        writeToOutputDeviceRef
      }}
    >
      {children}
    </SerialDataContext.Provider>
  );
}

export function useSerial() {
  return useContext(SerialDataContext);
}
