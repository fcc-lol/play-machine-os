import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useRef
} from "react";
import hardwareConfig from "../config/Hardware.json";

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

    // If in simulator mode, set initial connected states to true and initialize default values
    if (onDevice === "false") {
      setIsInputConnected(true);
      setIsOutputConnected(true);

      // Initialize default values for all hardware items
      const defaultData = {};

      // Initialize buttons
      Object.entries(hardwareConfig.buttons).forEach(([id, label]) => {
        defaultData[label] = { value: false };
      });

      // Initialize potentiometers
      Object.entries(hardwareConfig.potentiometers).forEach(([id, config]) => {
        defaultData[config.label] = { value: 0 };
      });

      setSerialData(defaultData);
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
