import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useRef,
  useCallback
} from "react";
import hardwareConfig from "../config/Hardware.json";
import { applyRemoteMappings } from "../utils/RemoteMapping";

const SerialDataContext = createContext();

// Define the order of controls for encoder navigation
const sliders = [
  { id: "vertical_slider_1", label: "Slider 1" },
  { id: "vertical_slider_2", label: "Slider 2" },
  { id: "vertical_slider_3", label: "Slider 3" }
];

const knobs = [
  { id: "knob_1", label: "Knob 1" },
  { id: "horizontal_slider", label: "H Slider" },
  { id: "knob_2", label: "Knob 2" },
  { id: "knob_3", label: "Knob 3" },
  { id: "knob_4", label: "Knob 4" },
  { id: "knob_5", label: "Knob 5" }
];

export const ALL_CONTROLS = [...sliders, ...knobs];

export function SerialDataProvider({
  children,
  isSimulatorMode,
  multiPlayerMode = false
}) {
  const [serialData, setSerialData] = useState({});
  const [isInputConnected, setIsInputConnected] = useState(false);
  const [isOutputConnected, setIsOutputConnected] = useState(false);
  const [selectedControlIndex, setSelectedControlIndex] = useState(0);
  const [hasActiveRemotes, setHasActiveRemotes] = useState(false);
  const writeToOutputDeviceRef = useRef(null);
  const setSerialDataRef = useRef(null);
  const hardwareStateAtSetSerialDataRef = useRef(null);
  const latestHardwareStateRef = useRef({});
  const serialDataRef = useRef({});
  const previousEncoderButtonRef = useRef(false);
  const selectedControlIndexRef = useRef(0);

  // Update ref when selectedControlIndex changes
  useEffect(() => {
    selectedControlIndexRef.current = selectedControlIndex;
  }, [selectedControlIndex]);

  // Update ref when serialData changes
  useEffect(() => {
    serialDataRef.current = serialData;
  }, [serialData]);

  // Handle encoder button cycling
  useEffect(() => {
    const currentEncoderButton = serialData.encoderButton?.value || false;
    const previousEncoderButton = previousEncoderButtonRef.current;

    // Detect rising edge (button press)
    if (currentEncoderButton && !previousEncoderButton) {
      setSelectedControlIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % ALL_CONTROLS.length;
        return nextIndex;
      });
    }

    previousEncoderButtonRef.current = currentEncoderButton;
  }, [serialData.encoderButton?.value, selectedControlIndex]);

  // Function to set serial data from socket events
  const setSerialDataFromSocket = useCallback(
    (data) => {
      // If multiPlayerMode is false, ignore all remote data completely
      if (!multiPlayerMode) {
        // Filter out any remote data
        const filteredData = Object.keys(data).reduce((acc, key) => {
          if (!key.startsWith("remote_")) {
            acc[key] = data[key];
          }
          return acc;
        }, {});

        // If no non-remote data remains, don't update anything
        if (Object.keys(filteredData).length === 0) {
          return;
        }

        // Process the filtered data normally
        data = filteredData;
      }

      const currentIndex = selectedControlIndexRef.current;

      // Check if this data contains remote information
      const hasRemoteData = Object.keys(data).some((key) =>
        key.startsWith("remote_")
      );
      if (hasRemoteData) {
        setHasActiveRemotes(true);
      }

      // Apply remote mappings to socket data before using it
      const mappedData = applyRemoteMappings(data, ALL_CONTROLS[currentIndex]);

      // Store the latest actual hardware state when socket data arrives
      hardwareStateAtSetSerialDataRef.current = {
        ...latestHardwareStateRef.current
      };
      // Mark that we have socket data active
      setSerialDataRef.current = mappedData;
      // Update the serial data with the mapped socket data
      setSerialData(mappedData);
    },
    [multiPlayerMode]
  );

  // Function to update serial data that respects setSerialData overrides
  const updateSerialData = useCallback(
    (newData) => {
      // If multiPlayerMode is true, only allow simulator data (when isSimulatorMode=true)
      // Block hardware data (when isSimulatorMode=false)
      if (multiPlayerMode && !isSimulatorMode) {
        return;
      }

      // If multiPlayerMode is false, filter out any remote data
      if (!multiPlayerMode) {
        const filteredData = Object.keys(newData).reduce((acc, key) => {
          if (!key.startsWith("remote_")) {
            acc[key] = newData[key];
          }
          return acc;
        }, {});

        // If no non-remote data remains, don't update anything
        if (Object.keys(filteredData).length === 0) {
          return;
        }

        // Process the filtered data
        newData = filteredData;
      }

      const currentIndex = selectedControlIndexRef.current;

      // Check if this data contains remote information
      const hasRemoteData = Object.keys(newData).some((key) =>
        key.startsWith("remote_")
      );
      if (hasRemoteData) {
        setHasActiveRemotes(true);
      }

      // Get the current selected control at this moment
      const currentSelectedControl = ALL_CONTROLS[currentIndex];

      // Apply remote mappings to all incoming data
      const mappedNewData = applyRemoteMappings(
        newData,
        currentSelectedControl
      );

      // Always update the latest hardware state with mapped data
      latestHardwareStateRef.current = {
        ...latestHardwareStateRef.current,
        ...mappedNewData
      };

      if (setSerialDataRef.current) {
        // If we have setSerialData active, check if hardware has changed
        if (hardwareStateAtSetSerialDataRef.current) {
          const hasHardwareChange = Object.keys(
            latestHardwareStateRef.current
          ).some((key) => {
            const currentValue = latestHardwareStateRef.current[key]?.value;
            const storedValue =
              hardwareStateAtSetSerialDataRef.current[key]?.value;

            // Skip if either value is undefined
            if (currentValue === undefined || storedValue === undefined)
              return false;

            // For boolean values (buttons), any change is significant
            if (
              typeof currentValue === "boolean" &&
              typeof storedValue === "boolean"
            ) {
              return currentValue !== storedValue;
            }

            // For numeric values (sliders), check if change is greater than 1
            if (
              typeof currentValue === "number" &&
              typeof storedValue === "number"
            ) {
              return Math.abs(currentValue - storedValue) > 1;
            }

            return false;
          });

          if (hasHardwareChange) {
            // Hardware has changed, clear the override and use hardware inputs
            setSerialDataRef.current = null;
            hardwareStateAtSetSerialDataRef.current = null;
            setSerialData({ ...latestHardwareStateRef.current });
          }
          // If no hardware change, keep the socket data active
        }
      } else {
        // No override active, update with mapped hardware data
        setSerialData({ ...serialDataRef.current, ...mappedNewData });
      }
    },
    [multiPlayerMode, isSimulatorMode]
  );

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

    // Initialize latestHardwareStateRef with default values
    latestHardwareStateRef.current = { ...defaultData };

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
        setSerialData: setSerialDataFromSocket,
        updateSerialData,
        isInputConnected,
        setIsInputConnected,
        isOutputConnected,
        setIsOutputConnected,
        isSimulatorMode,
        multiPlayerMode,
        writeToOutputDeviceRef,
        selectedControlIndex,
        setSelectedControlIndex,
        selectedControl: ALL_CONTROLS[selectedControlIndex],
        hasActiveRemotes
      }}
    >
      {children}
    </SerialDataContext.Provider>
  );
}

export function useSerial() {
  return useContext(SerialDataContext);
}
