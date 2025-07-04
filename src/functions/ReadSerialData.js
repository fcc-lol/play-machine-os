import React, {
  useEffect,
  useCallback,
  useMemo,
  useState,
  useRef
} from "react";
import { useSerial } from "./SerialDataContext";
import styled from "styled-components";
import hardware from "../config/Hardware.json";
import ConvertRange from "../functions/ConvertRange";
import { applyRemoteMappings } from "../utils/RemoteMapping";

// Helper function to get the appropriate hardware configuration
const getHardwareConfig = (useAltMapping = false) => {
  if (useAltMapping && hardware.altMapping) {
    return {
      ...hardware,
      potentiometers: hardware.altMapping.potentiometers,
      buttons: hardware.altMapping.buttons
    };
  }
  return hardware;
};

const roundToNearestTenth = (number) => Math.round(number);

const ConnectButton = styled.button`
  position: relative;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: #000000;
  color: white;
  font-weight: bold;
  font-size: 2rem;
  border: none;
  position: absolute;
  font-family: system-ui;
`;

const RefreshButton = styled.button`
  position: absolute;
  bottom: 2rem;
  right: 2rem;
  background-color: rgba(255, 255, 255, 0.25);
  color: white;
  font-weight: bold;
  font-size: 1.125rem;
  border: none;
  padding: 1rem 1.5rem;
  border-radius: 0.5rem;
  z-index: 1000;
`;

function ReadSerialData() {
  const {
    updateSerialData,
    isInputConnected,
    setIsInputConnected,
    isOutputConnected,
    setIsOutputConnected,
    isSimulatorMode,
    externalController,
    writeToOutputDeviceRef,
    remoteControlMappings
  } = useSerial();

  const [lastProcessedTime, setLastProcessedTime] = useState(0);
  const inputDataBufferRef = useRef("");
  const outputDataBufferRef = useRef("");
  const inputPortRef = useRef(null);
  const outputPortRef = useRef(null);
  const inputReaderRef = useRef(null);
  const outputReaderRef = useRef(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const processSerialData = useCallback(
    (dataString, isInput) => {
      const currentTime = Date.now();
      if (currentTime - lastProcessedTime < 10) return;

      // Get the appropriate hardware configuration
      const activeHardwareConfig = getHardwareConfig(externalController);

      const processedData = {};
      const dataStrings = dataString.split(";");

      for (const dataItem of dataStrings) {
        if (dataItem.trim() === "") continue;

        const [id, rawValue] = dataItem.split("=");
        let value;

        if (id.includes("button_")) {
          value = rawValue.trim().toLowerCase() === "true";
          const label = activeHardwareConfig.buttons[id] || id;
          processedData[label] = { value };
        } else if (id.includes("potentiometer_")) {
          const config = activeHardwareConfig.potentiometers[id];
          if (config) {
            const rawNumValue = parseFloat(rawValue);
            const value0to100 = ConvertRange(
              ((rawNumValue - config.range[0]) /
                (config.range[1] - config.range[0])) *
                100,
              config.outputRange[0],
              config.outputRange[1]
            );
            let value = roundToNearestTenth(value0to100);
            // Invert the value if the potentiometer is configured as inverted
            if (config.inverted) {
              value = 100 - value;
            }
            processedData[config.label] = { value };
          }
        } else if (id.includes("remote_")) {
          // Handle remote inputs
          const rawNumValue = parseFloat(rawValue);
          let value = roundToNearestTenth(rawNumValue);
          // Ensure value is within 0-100 range
          value = Math.max(0, Math.min(100, value));
          processedData[id] = { value };
        }
      }

      // Apply remote mappings to override input data
      const finalData = applyRemoteMappings(
        processedData,
        remoteControlMappings
      );

      // Use functional update to avoid dependency on serialData
      updateSerialData(finalData);
      setLastProcessedTime(currentTime);
    },
    [
      lastProcessedTime,
      updateSerialData,
      remoteControlMappings,
      externalController
    ]
  );

  const readSerialData = useCallback(
    async (port, isInput) => {
      const readerRef = isInput ? inputReaderRef : outputReaderRef;
      const dataBufferRef = isInput ? inputDataBufferRef : outputDataBufferRef;

      if (readerRef.current) {
        const currentReader = readerRef.current;
        readerRef.current = null;
        try {
          await currentReader.cancel();
          currentReader.releaseLock();
        } catch (error) {
          console.error("Error releasing previous reader:", error);
        }
      }

      try {
        const newReader = port.readable.getReader();
        readerRef.current = newReader;

        while (true) {
          const { value, done } = await newReader.read();
          if (done) {
            break;
          }
          if (value) {
            const chunk = new TextDecoder().decode(value);
            dataBufferRef.current += chunk;

            let endIndex;
            while ((endIndex = dataBufferRef.current.indexOf("\n")) !== -1) {
              const line = dataBufferRef.current.slice(0, endIndex);
              dataBufferRef.current = dataBufferRef.current.slice(endIndex + 1);
              processSerialData(line, isInput);
            }
          }
        }
      } catch (error) {
        console.error(
          `Error reading from ${isInput ? "input" : "output"} port:`,
          error
        );
      } finally {
        if (readerRef.current) {
          const currentReader = readerRef.current;
          readerRef.current = null;
          try {
            await currentReader.cancel();
            currentReader.releaseLock();
          } catch (error) {
            console.error("Error releasing reader:", error);
          }
        }
      }
    },
    [processSerialData]
  );

  const connectToPort = useCallback(
    async (isInput) => {
      const portRef = isInput ? inputPortRef : outputPortRef;
      const activeHardwareConfig = getHardwareConfig(externalController);

      try {
        if (portRef.current) {
          return portRef.current;
        }

        const ports = await navigator.serial.getPorts();

        // First, try to find a previously granted port
        const previouslyGrantedPorts = ports.filter((port) => {
          const info = port.getInfo();
          return (
            info.usbVendorId === 0x2341 || // Arduino
            info.usbVendorId === 0x1a86 // CH340/CH341
          );
        });

        // If we have previously granted ports, try to identify them
        if (previouslyGrantedPorts.length > 0) {
          for (const port of previouslyGrantedPorts) {
            // Skip if this port is already being used by the other device
            const otherPortRef = isInput ? outputPortRef : inputPortRef;
            if (otherPortRef.current && otherPortRef.current === port) {
              continue;
            }

            try {
              await port.open({
                baudRate: activeHardwareConfig.serial.baudRate
              });
              const writer = port.writable.getWriter();

              // Send identification request
              await writer.write(new TextEncoder().encode("IDENT\n"));
              writer.releaseLock();

              // Wait for response
              const reader = port.readable.getReader();
              const { value } = await reader.read();
              const response = new TextDecoder().decode(value);
              reader.releaseLock();

              // If we're looking for input device and it's not an output device, use it
              if (isInput && !response.includes("LED")) {
                setIsInputConnected(true);
                inputPortRef.current = port;
                return port;
              }
              // If we're looking for output device and it responds as such, use it
              else if (!isInput && response.includes("LED")) {
                setIsOutputConnected(true);
                outputPortRef.current = port;
                return port;
              } else {
                await port.close();
              }
            } catch (error) {
              console.error(`Error identifying port: ${error}`);
              try {
                await port.close();
              } catch (closeError) {
                console.error(`Error closing port: ${closeError}`);
              }
            }
          }
        }

        // If no previously granted ports worked, request a new one
        const port = await navigator.serial.requestPort({
          filters: [
            { usbVendorId: 0x2341 }, // Arduino
            { usbVendorId: 0x1a86 } // CH340/CH341
          ]
        });

        if (port) {
          try {
            await port.open({ baudRate: activeHardwareConfig.serial.baudRate });
            const writer = port.writable.getWriter();

            // Send identification request
            await writer.write(new TextEncoder().encode("IDENT\n"));
            writer.releaseLock();

            // Wait for response
            const reader = port.readable.getReader();
            const { value } = await reader.read();
            const response = new TextDecoder().decode(value);
            reader.releaseLock();

            // If we're looking for input device and it's not an output device, use it
            if (isInput && !response.includes("LED")) {
              setIsInputConnected(true);
              inputPortRef.current = port;
              return port;
            }
            // If we're looking for output device and it responds as such, use it
            else if (!isInput && response.includes("LED")) {
              setIsOutputConnected(true);
              outputPortRef.current = port;
              return port;
            } else {
              await port.close();
              throw new Error("Device identification failed");
            }
          } catch (error) {
            console.error(`Error identifying new port: ${error}`);
            try {
              await port.close();
            } catch (closeError) {
              console.error(`Error closing port: ${closeError}`);
            }
          }
        }
      } catch (error) {
        console.error(
          `There was an error connecting to the ${
            isInput ? "input" : "output"
          } device:`,
          error
        );
      }
    },
    [setIsInputConnected, setIsOutputConnected, externalController]
  );

  const startSerialCommunication = useCallback(async () => {
    try {
      const inputPort = await connectToPort(true);
      let outputPort = null;

      // Only connect to LED controller if not ignored
      if (!externalController) {
        outputPort = await connectToPort(false);
      } else {
        // If LED serial is ignored, set output as connected (for UI purposes)
        setIsOutputConnected(true);
      }

      if (inputPort) {
        inputPort.ondisconnect = () => {
          setIsInputConnected(false);
        };
        await readSerialData(inputPort, true);
      }

      if (outputPort) {
        outputPort.ondisconnect = () => {
          setIsOutputConnected(false);
        };
        await readSerialData(outputPort, false);
      }
    } catch (error) {
      console.error("Error starting serial communication:", error);
    }
  }, [
    connectToPort,
    readSerialData,
    setIsInputConnected,
    setIsOutputConnected,
    externalController
  ]);

  useEffect(() => {
    if (isSimulatorMode) {
      return;
    } else {
      if (!("serial" in navigator)) {
        alert("Web Serial API not supported!");
        return;
      }

      if (!isInitialized) {
        setIsInitialized(true);
      }
    }
  }, [isSimulatorMode, isInitialized]);

  useEffect(() => {
    return () => {
      // Cleanup function to close the ports and release readers when component unmounts
      [inputReaderRef, outputReaderRef].forEach((readerRef) => {
        if (readerRef.current) {
          const currentReader = readerRef.current;
          readerRef.current = null;
          try {
            currentReader.cancel().catch(console.error);
            currentReader.releaseLock();
          } catch (error) {
            console.error("Error during cleanup:", error);
          }
        }
      });

      [inputPortRef, outputPortRef].forEach((portRef) => {
        if (portRef.current) {
          const currentPort = portRef.current;
          portRef.current = null;
          try {
            currentPort.close();
          } catch (error) {
            console.error("Error closing port:", error);
          }
        }
      });

      setIsInputConnected(false);
      setIsOutputConnected(false);
    };
  }, [setIsInputConnected, setIsOutputConnected]);

  const connectButton = useMemo(() => {
    // When LED serial is ignored, only require input connection
    const needsConnection = externalController
      ? !isInputConnected
      : !isInputConnected || !isOutputConnected;

    return (
      needsConnection &&
      !isSimulatorMode && (
        <ConnectButton onClick={startSerialCommunication}>
          Tap anywhere to start
        </ConnectButton>
      )
    );
  }, [
    isInputConnected,
    isOutputConnected,
    startSerialCommunication,
    isSimulatorMode,
    externalController
  ]);

  const refreshButton = useMemo(() => {
    // When LED serial is ignored, only require input connection
    const needsConnection = externalController
      ? !isInputConnected
      : !isInputConnected || !isOutputConnected;

    return (
      needsConnection &&
      !isSimulatorMode && (
        <RefreshButton onClick={() => window.location.reload()}>
          Refresh
        </RefreshButton>
      )
    );
  }, [
    isInputConnected,
    isOutputConnected,
    isSimulatorMode,
    externalController
  ]);

  // Add function to write to output device
  const writeToOutputDevice = useCallback(
    async (data) => {
      if (isSimulatorMode || externalController) {
        return; // Skip writing in simulator mode or when LED serial is ignored
      }

      if (!outputPortRef.current || !isOutputConnected) {
        console.error("Output device not connected");
        return;
      }

      try {
        // Check if the stream is already locked
        if (outputPortRef.current.writable.locked) {
          return; // Skip this write if the stream is locked
        }

        const writer = outputPortRef.current.writable.getWriter();
        await writer.write(new TextEncoder().encode(data + "\n"));
        writer.releaseLock();
      } catch (error) {
        console.error("Error writing to output device:", error);
      }
    },
    [isOutputConnected, isSimulatorMode, externalController]
  );

  // Set the write function in the context
  useEffect(() => {
    writeToOutputDeviceRef.current = writeToOutputDevice;
  }, [writeToOutputDevice, writeToOutputDeviceRef]);

  useEffect(() => {
    if (isOutputConnected && !isSimulatorMode && !externalController) {
      writeToOutputDevice("0,0,0,0");
    }
  }, [
    isOutputConnected,
    writeToOutputDevice,
    isSimulatorMode,
    externalController
  ]);

  return (
    <>
      {connectButton}
      {refreshButton}
    </>
  );
}

export default ReadSerialData;
