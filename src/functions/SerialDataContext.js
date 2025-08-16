import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useRef,
  useCallback
} from "react";
import hardwareConfig from "../config/Hardware.json";
import {
  applyRemoteMappings,
  initializeRemoteControlMappings,
  saveRemoteControlMappings,
  getNextControlIndex
} from "../utils/RemoteMapping";

// Helper function to get the appropriate hardware configuration
const getHardwareConfig = (useAltMapping = false) => {
  if (useAltMapping && hardwareConfig.altMapping) {
    return {
      ...hardwareConfig,
      potentiometers: hardwareConfig.altMapping.potentiometers,
      buttons: hardwareConfig.altMapping.buttons
    };
  }
  return hardwareConfig;
};

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
  multiPlayerMode = false,
  sendMessage = null,
  sendMessageRef = null
}) {
  const [serialData, setSerialData] = useState({});
  const [isInputConnected, setIsInputConnected] = useState(false);
  const [isOutputConnected, setIsOutputConnected] = useState(false);
  const [remoteControlMappings, setRemoteControlMappings] = useState(() =>
    initializeRemoteControlMappings(ALL_CONTROLS)
  );
  const [hasActiveRemotes, setHasActiveRemotes] = useState(false);
  // Check URL parameter for disabling LED serial connection
  const [externalController] = useState(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get("externalController") === "true";
  });
  const writeToOutputDeviceRef = useRef(null);
  const setSerialDataRef = useRef(null);
  const hardwareStateAtSetSerialDataRef = useRef(null);
  const latestHardwareStateRef = useRef({});
  const serialDataRef = useRef({});
  const previousEncoderButtonsRef = useRef({});
  const remoteControlMappingsRef = useRef(remoteControlMappings);

  // Update ref when remoteControlMappings changes
  useEffect(() => {
    remoteControlMappingsRef.current = remoteControlMappings;
    saveRemoteControlMappings(remoteControlMappings);
  }, [remoteControlMappings]);

  // Update ref when serialData changes
  useEffect(() => {
    serialDataRef.current = serialData;
  }, [serialData]);

  // Handle per-device encoder button cycling
  useEffect(() => {
    // Check each device's encoder button
    Object.keys(serialData).forEach((key) => {
      if (key.startsWith("encoderButton_")) {
        const deviceId = key.replace("encoderButton_", "");
        const currentEncoderButton = serialData[key]?.value || false;
        const previousEncoderButton =
          previousEncoderButtonsRef.current[deviceId] || false;

        // Detect rising edge (button press)
        if (currentEncoderButton && !previousEncoderButton) {
          setRemoteControlMappings((prevMappings) => {
            const currentAssignment = prevMappings[deviceId];
            let startIndex = 0;

            if (currentAssignment) {
              // Find current control index
              const currentIndex = ALL_CONTROLS.findIndex(
                (control) => control.id === currentAssignment.id
              );
              startIndex = getNextControlIndex(currentIndex, ALL_CONTROLS);
            }

            // Find next available control that's not assigned to another remote
            let newControlIndex = startIndex;
            let attempts = 0;
            const maxAttempts = ALL_CONTROLS.length;

            while (attempts < maxAttempts) {
              const candidateControl = ALL_CONTROLS[newControlIndex];

              // Check if this control is assigned to any other remote (not this one)
              const isAssignedToOtherRemote = Object.entries(prevMappings).some(
                ([otherDeviceId, assignedControl]) =>
                  otherDeviceId !== deviceId &&
                  assignedControl?.id === candidateControl.id
              );

              // If not assigned to another remote, use it
              if (!isAssignedToOtherRemote) {
                break;
              }

              // Try next control
              newControlIndex = getNextControlIndex(
                newControlIndex,
                ALL_CONTROLS
              );
              attempts++;
            }

            // If all controls are taken, fallback to the next control anyway
            // This handles the edge case where we have more remotes than controls
            const newControl = ALL_CONTROLS[newControlIndex];

            // Send socket event when control selection changes
            const effectiveSendMessage = sendMessage || sendMessageRef?.current;
            if (
              effectiveSendMessage &&
              typeof effectiveSendMessage === "function"
            ) {
              try {
                effectiveSendMessage({
                  action: "parameterChanged",
                  data: {
                    controlName: newControl.id,
                    controlLabel: newControl.label,
                    value: serialDataRef.current[newControl.id]?.value || 0,
                    deviceId: deviceId
                  }
                });
              } catch (error) {
                console.warn(
                  "Failed to send parameterChanged socket event:",
                  error
                );
              }
            }

            return {
              ...prevMappings,
              [deviceId]: newControl
            };
          });
        }

        previousEncoderButtonsRef.current[deviceId] = currentEncoderButton;
      }
    });
  }, [serialData, sendMessage, sendMessageRef]);

  // Function to set serial data from socket events
  const setSerialDataFromSocket = useCallback(
    (data) => {
      // If multiPlayerMode is false, ignore all remote data completely
      if (!multiPlayerMode) {
        // Filter out any remote data
        const filteredData = Object.keys(data).reduce((acc, key) => {
          if (
            !key.startsWith("remote_") &&
            !key.startsWith("encoderButton_") &&
            !key.startsWith("button_a_") &&
            !key.startsWith("button_b_")
          ) {
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

      const currentMappings = remoteControlMappingsRef.current;

      // Check if this data contains remote information
      const hasRemoteData = Object.keys(data).some(
        (key) =>
          key.startsWith("remote_") ||
          key.startsWith("encoderButton_") ||
          key.startsWith("button_a_") ||
          key.startsWith("button_b_")
      );
      if (hasRemoteData) {
        setHasActiveRemotes(true);
      }

      // Apply remote mappings to socket data before using it
      const effectiveSendMessage = sendMessage || sendMessageRef?.current;
      const mappedData = applyRemoteMappings(
        data,
        currentMappings,
        effectiveSendMessage
      );

      // Store the latest actual hardware state when socket data arrives
      hardwareStateAtSetSerialDataRef.current = {
        ...latestHardwareStateRef.current
      };
      // Mark that we have socket data active
      setSerialDataRef.current = mappedData;
      // Update the serial data with the mapped socket data
      setSerialData(mappedData);
    },
    [multiPlayerMode, sendMessage, sendMessageRef]
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
          if (
            !key.startsWith("remote_") &&
            !key.startsWith("encoderButton_") &&
            !key.startsWith("button_a_") &&
            !key.startsWith("button_b_")
          ) {
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

      const currentMappings = remoteControlMappingsRef.current;

      // Check if this data contains remote information
      const hasRemoteData = Object.keys(newData).some(
        (key) =>
          key.startsWith("remote_") ||
          key.startsWith("encoderButton_") ||
          key.startsWith("button_a_") ||
          key.startsWith("button_b_")
      );
      if (hasRemoteData) {
        setHasActiveRemotes(true);
      }

      // Apply remote mappings to all incoming data
      const effectiveSendMessage = sendMessage || sendMessageRef?.current;
      const mappedNewData = applyRemoteMappings(
        newData,
        currentMappings,
        effectiveSendMessage
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
    [multiPlayerMode, isSimulatorMode, sendMessage, sendMessageRef]
  );

  // Helper function to get assigned control for a device
  const getAssignedControl = useCallback(
    (deviceId) => {
      return remoteControlMappings[deviceId] || null;
    },
    [remoteControlMappings]
  );

  // Helper function to manually set control assignment for a device
  const setControlAssignment = useCallback((deviceId, control) => {
    setRemoteControlMappings((prevMappings) => ({
      ...prevMappings,
      [deviceId]: control
    }));
  }, []);

  useEffect(() => {
    // Get the appropriate hardware configuration
    const activeHardwareConfig = getHardwareConfig(externalController);

    // Initialize default values for all hardware items
    const defaultData = {};

    // Initialize buttons
    Object.entries(activeHardwareConfig.buttons).forEach(([id, label]) => {
      defaultData[label] = { value: false };
    });

    // Initialize potentiometers
    Object.entries(activeHardwareConfig.potentiometers).forEach(
      ([id, config]) => {
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
      }
    );

    // Initialize latestHardwareStateRef with default values
    latestHardwareStateRef.current = { ...defaultData };

    // Only set initial connected states and data in simulator mode
    if (isSimulatorMode) {
      setIsInputConnected(true);
      // Always set output connected in simulator mode, or when LED serial is ignored
      setIsOutputConnected(true);
      setSerialData(defaultData);
    } else {
      // In non-simulator mode, set output connected if LED serial is ignored
      if (externalController) {
        setIsOutputConnected(true);
      }
      // Preserve existing values
      setSerialData((prevData) => ({
        ...prevData,
        ...defaultData
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSimulatorMode, externalController]);

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
        externalController,
        writeToOutputDeviceRef,
        remoteControlMappings,
        setRemoteControlMappings,
        getAssignedControl,
        setControlAssignment,
        hasActiveRemotes,
        // Legacy compatibility - returns the first assigned control or default
        selectedControlIndex: 0,
        selectedControl:
          Object.values(remoteControlMappings)[0] || ALL_CONTROLS[0]
      }}
    >
      {children}
    </SerialDataContext.Provider>
  );
}

export function useSerial() {
  return useContext(SerialDataContext);
}
