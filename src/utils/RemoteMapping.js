// Utility function to apply remote mappings to any input data
export const applyRemoteMappings = (inputData, remoteControlMappings = {}) => {
  // Early return if no input data
  if (!inputData || typeof inputData !== "object") {
    return inputData || {};
  }

  const remoteOverrides = { ...inputData };

  // Use dynamic mapping with per-remote control assignments
  Object.keys(inputData).forEach((key) => {
    if (
      key.startsWith("remote_") &&
      inputData[key] &&
      inputData[key].value !== undefined
    ) {
      // Extract the device ID from the remote key (e.g., "remote_device1" -> "device1")
      const deviceId = key.replace("remote_", "");

      // Get the assigned control for this specific remote device
      const assignedControl = remoteControlMappings[deviceId];

      if (assignedControl) {
        // Map this remote data to the control assigned to this specific device
        remoteOverrides[assignedControl.id] = inputData[key];

        // Save remote value to localStorage (same as manual simulator changes)
        localStorage.setItem(
          `slider_${assignedControl.id}`,
          inputData[key].value
        );
      }
    }
  });

  return remoteOverrides;
};

// Utility function to convert socket remote data to the expected format
export const convertSocketRemoteData = (socketData) => {
  const convertedData = {};

  // Handle remoteSerialData format from socket
  if (
    socketData &&
    socketData.action === "remoteSerialData" &&
    socketData.data
  ) {
    const { deviceId, value, encoderButton, confirmButton, backButton } =
      socketData.data;

    if (deviceId) {
      // Handle the main value (for knobs/sliders) - use device-specific key
      if (value !== undefined) {
        const remoteKey = `remote_${deviceId}`;
        convertedData[remoteKey] = { value: Math.max(0, Math.min(100, value)) };
      }

      // Handle encoder button - use device-specific key
      if (encoderButton !== undefined) {
        convertedData[`encoderButton_${deviceId}`] = {
          value: Boolean(encoderButton)
        };
      }

      // Handle confirm button (could map to button_a) - use device-specific key
      if (confirmButton !== undefined) {
        convertedData[`button_a_${deviceId}`] = {
          value: Boolean(confirmButton)
        };
      }

      // Handle back button (could map to button_b) - use device-specific key
      if (backButton !== undefined) {
        convertedData[`button_b_${deviceId}`] = { value: Boolean(backButton) };
      }
    }
  }

  return convertedData;
};

// Utility function to get the next control index for a specific device
export const getNextControlIndex = (currentIndex, controlsArray) => {
  return (currentIndex + 1) % controlsArray.length;
};

// Utility function to initialize remote control mappings
export const initializeRemoteControlMappings = (controlsArray) => {
  const mappings = {};

  // Try to load saved mappings from localStorage
  const savedMappings = localStorage.getItem("remoteControlMappings");
  if (savedMappings) {
    try {
      const parsed = JSON.parse(savedMappings);
      // Validate that the saved controls still exist
      Object.keys(parsed).forEach((deviceId) => {
        const savedControl = parsed[deviceId];
        const controlExists = controlsArray.find(
          (control) => control.id === savedControl.id
        );
        if (controlExists) {
          mappings[deviceId] = savedControl;
        }
      });
    } catch (error) {
      console.warn("Failed to parse saved remote control mappings:", error);
    }
  }

  return mappings;
};

// Utility function to save remote control mappings to localStorage
export const saveRemoteControlMappings = (mappings) => {
  try {
    localStorage.setItem("remoteControlMappings", JSON.stringify(mappings));
  } catch (error) {
    console.warn("Failed to save remote control mappings:", error);
  }
};
