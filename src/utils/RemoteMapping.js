// Utility function to apply remote mappings to any input data
export const applyRemoteMappings = (inputData, selectedControl = null) => {
  // Early return if no input data
  if (!inputData || typeof inputData !== "object") {
    return inputData || {};
  }

  const remoteOverrides = { ...inputData };

  // Use dynamic mapping with selected control
  if (selectedControl) {
    // Check if we have any remote data (looking for remote_XXX keys)
    Object.keys(inputData).forEach((key) => {
      if (
        key.startsWith("remote_") &&
        inputData[key] &&
        inputData[key].value !== undefined
      ) {
        // Map this remote data to the currently selected control
        remoteOverrides[selectedControl.id] = inputData[key];

        // Save remote value to localStorage (same as manual simulator changes)
        localStorage.setItem(
          `slider_${selectedControl.id}`,
          inputData[key].value
        );
      }
    });
  }

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
      // Handle the main value (for knobs/sliders)
      if (value !== undefined) {
        const remoteKey = `remote_${deviceId}`;
        convertedData[remoteKey] = { value: Math.max(0, Math.min(100, value)) };
      }

      // Handle encoder button
      if (encoderButton !== undefined) {
        convertedData.encoderButton = { value: Boolean(encoderButton) };
      }

      // Handle confirm button (could map to button_a)
      if (confirmButton !== undefined) {
        convertedData.button_a = { value: Boolean(confirmButton) };
      }

      // Handle back button (could map to button_b)
      if (backButton !== undefined) {
        convertedData.button_b = { value: Boolean(backButton) };
      }
    }
  }

  return convertedData;
};
