import React, {
  useEffect,
  useCallback,
  useMemo,
  useState,
  useRef
} from "react";
import { useSerial } from "./SerialDataContext";
import styled from "styled-components";
import hardwareConfig from "./config/Hardware.json";

const convertRange = (value, r1, r2) =>
  ((value - r1[0]) * (r2[1] - r2[0])) / (r1[1] - r1[0]) + r2[0];

const roundToNearestTenth = (number) => Math.round(number);

const ConnectButton = styled.button`
  position: fixed;
  top: 20px;
  left: 20px;
  padding: 10px 20px;
  background-color: #4caf50;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
  z-index: 1000;

  &:hover {
    background-color: #45a049;
  }
`;

function ReadSerialData() {
  const { setSerialData, isConnected, setIsConnected, isSimulatorMode } =
    useSerial();
  const [lastProcessedTime, setLastProcessedTime] = useState(0);
  const dataBufferRef = useRef("");
  const portRef = useRef(null);
  const readerRef = useRef(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const processSerialData = useCallback(
    (dataString) => {
      const currentTime = Date.now();
      if (currentTime - lastProcessedTime < 10) return; // Reduced debounce time to 10ms

      const processedData = {};
      const dataStrings = dataString.split(";");

      for (const dataItem of dataStrings) {
        if (dataItem.trim() === "") continue;

        const [id, rawValue] = dataItem.split("=");
        let value;

        if (id.includes("button_")) {
          value = rawValue.trim().toLowerCase() === "true";
          const label = hardwareConfig.buttons[id] || id;
          processedData[label] = { value };
        } else if (id.includes("potentiometer_")) {
          const config = hardwareConfig.potentiometers[id];
          if (config) {
            const rawNumValue = parseFloat(rawValue);
            const value0to100 = convertRange(
              rawNumValue,
              config.range,
              config.inverted
                ? [config.outputRange[1], config.outputRange[0]]
                : config.outputRange
            );
            value = roundToNearestTenth(value0to100);
            processedData[config.label] = { value };
          }
        }
      }

      setSerialData((prevData) => ({ ...prevData, ...processedData }));
      setLastProcessedTime(currentTime);
    },
    [setSerialData, lastProcessedTime]
  );

  const readSerialData = useCallback(
    async (port) => {
      // If there's already a reader, release it first
      if (readerRef.current) {
        const currentReader = readerRef.current;
        readerRef.current = null; // Clear the reference first
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
            console.log("Stream closed");
            break;
          }
          if (value) {
            const chunk = new TextDecoder().decode(value);
            dataBufferRef.current += chunk;

            let endIndex;
            while ((endIndex = dataBufferRef.current.indexOf("\n")) !== -1) {
              const line = dataBufferRef.current.slice(0, endIndex);
              dataBufferRef.current = dataBufferRef.current.slice(endIndex + 1);
              processSerialData(line);
            }
          }
        }
      } catch (error) {
        console.error("Error reading from serial port:", error);
      } finally {
        if (readerRef.current) {
          const currentReader = readerRef.current;
          readerRef.current = null; // Clear the reference first
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

  const connectToPort = useCallback(async () => {
    try {
      if (portRef.current) {
        console.log("Using existing port connection");
        return portRef.current;
      }

      // First, check for previously granted ports
      const ports = await navigator.serial.getPorts();
      const previouslyGrantedPort = ports.find((port) => {
        const info = port.getInfo();
        return (
          info.usbVendorId === 0x2341 || // Arduino
          info.usbVendorId === 0x1a86 // CH340/CH341
        );
      });

      if (previouslyGrantedPort) {
        console.log("Found previously granted port, attempting to connect...");
        await previouslyGrantedPort.open({ baudRate: 9600 });
        console.log("Connected to previously granted device.");
        setIsConnected(true);
        portRef.current = previouslyGrantedPort;
        return previouslyGrantedPort;
      }

      // If no previously granted port found, request a new one
      const port = await navigator.serial.requestPort({
        filters: [
          { usbVendorId: 0x2341 }, // Arduino
          { usbVendorId: 0x1a86 } // CH340/CH341
        ]
      });

      if (port) {
        console.log("New port selected, attempting to connect...");
        await port.open({ baudRate: 9600 });
        console.log("Connected to new device successfully.");
        setIsConnected(true);
        portRef.current = port;
        return port;
      }
    } catch (error) {
      console.error("There was an error connecting to the device:", error);
    }
  }, [setIsConnected]);

  const startSerialCommunication = useCallback(async () => {
    try {
      const port = await connectToPort();
      if (port) {
        port.ondisconnect = () => {
          console.log("Device disconnected");
          setIsConnected(false);
        };
        await readSerialData(port);
      }
    } catch (error) {
      console.error("Error starting serial communication:", error);
    }
  }, [connectToPort, readSerialData, setIsConnected]);

  useEffect(() => {
    if (isSimulatorMode) {
      console.log("Running in simulator mode - skipping serial connection");
      return;
    }

    if (!("serial" in navigator)) {
      console.log("Web Serial API not supported!");
      alert("Web Serial API not supported!");
      return;
    }

    // Only log once and attempt to connect to previously granted port
    if (!isInitialized) {
      console.log("Web Serial API is supported!");
      setIsInitialized(true);

      // Try to connect to previously granted port
      if (!portRef.current) {
        connectToPort()
          .then((port) => {
            if (port) {
              readSerialData(port);
            }
          })
          .catch((error) => {
            console.error(
              "Error connecting to previously granted port:",
              error
            );
          });
      }
    }
  }, [connectToPort, readSerialData, isSimulatorMode, isInitialized]);

  useEffect(() => {
    return () => {
      // Cleanup function to close the port and release reader when component unmounts
      if (readerRef.current) {
        const currentReader = readerRef.current;
        readerRef.current = null; // Clear the reference first
        try {
          currentReader.cancel().catch(console.error);
          currentReader.releaseLock();
        } catch (error) {
          console.error("Error during cleanup:", error);
        }
      }
      if (portRef.current) {
        const currentPort = portRef.current;
        portRef.current = null; // Clear the reference first
        try {
          currentPort.close();
        } catch (error) {
          console.error("Error closing port:", error);
        } finally {
          setIsConnected(false);
        }
      }
    };
  }, [setIsConnected]);

  const connectButton = useMemo(
    () =>
      !isConnected &&
      !isSimulatorMode && (
        <ConnectButton onClick={startSerialCommunication}>
          Connect to Hardware
        </ConnectButton>
      ),
    [isConnected, startSerialCommunication, isSimulatorMode]
  );

  return connectButton;
}

export default ReadSerialData;
