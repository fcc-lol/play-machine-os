import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useRef
} from "react";
import hardwareConfig from "../config/Hardware.json";

const SerialDataContext = createContext();

export function SerialDataProvider({ children, isSimulatorMode }) {
  const [serialData, setSerialData] = useState({});
  const [isInputConnected, setIsInputConnected] = useState(false);
  const [isOutputConnected, setIsOutputConnected] = useState(false);
  const writeToOutputDeviceRef = useRef(null);

  useEffect(() => {
    // Initialize default values for all hardware items
    const defaultData = {};

    // Initialize buttons
    Object.entries(hardwareConfig.buttons).forEach(([id, label]) => {
      defaultData[label] = { value: false };
    });

    // Initialize potentiometers
    Object.entries(hardwareConfig.potentiometers).forEach(([id, config]) => {
      let value = 0;
      if (isSimulatorMode) {
        // In simulator mode, use localStorage
        const savedValue = localStorage.getItem(`slider_${config.label}`);
        if (savedValue !== null) {
          value = parseInt(savedValue);
        }
      } else {
        // In non-simulator mode, use the last known value from serial input
        const lastValue = serialData[config.label]?.value;
        if (lastValue !== undefined) {
          value = lastValue;
          // Invert the value if the potentiometer is configured as inverted
          if (config.inverted) {
            value = 100 - value;
          }
        }
      }
      defaultData[config.label] = { value };
    });

    // Only set initial connected states and data in simulator mode
    if (isSimulatorMode) {
      setIsInputConnected(true);
      setIsOutputConnected(true);
      setSerialData(defaultData);
    } else {
      // In non-simulator mode, preserve existing values
      setSerialData((prevData) => ({
        ...prevData,
        ...defaultData
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSimulatorMode]);

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
