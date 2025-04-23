import React, {
  useEffect,
  useCallback,
  useMemo,
  useState,
  useRef
} from "react";
import { useSerial } from "./SerialDataContext";

const idToLabel = {
  button_1: "button_right",
  button_2: "button_a",
  button_3: "button_up",
  button_4: "button_left",
  button_5: "button_b",
  button_6: "button_down",
  potentiometer_1: "vertical_slider_1",
  potentiometer_2: "vertical_slider_3",
  potentiometer_3: "vertical_slider_2",
  potentiometer_4: "horizontal_slider",
  potentiometer_5: "knob_2",
  potentiometer_6: "knob_4",
  potentiometer_7: "knob_1",
  potentiometer_8: "knob_5",
  potentiometer_9: "knob_3"
};

const convertRange = (value, r1, r2) =>
  ((value - r1[0]) * (r2[1] - r2[0])) / (r1[1] - r1[0]) + r2[0];

const roundToNearestTenth = (number) => Math.round(number);

function ReadSerialData() {
  const { setSerialData, isConnected, setIsConnected, isSimulatorMode } =
    useSerial();
  const [lastProcessedTime, setLastProcessedTime] = useState(0);
  const dataBufferRef = useRef("");

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
        } else if (id.includes("potentiometer_")) {
          const rawNumValue = parseFloat(rawValue);
          const value0to100 =
            id === "potentiometer_4"
              ? convertRange(rawNumValue, [0, 1023], [0, 100])
              : convertRange(rawNumValue, [0, 1023], [100, 0]);
          value = roundToNearestTenth(value0to100);
        }

        const label = idToLabel[id] || id;
        processedData[label] = { value };
      }

      setSerialData((prevData) => ({ ...prevData, ...processedData }));
      setLastProcessedTime(currentTime);
    },
    [setSerialData, lastProcessedTime]
  );

  const readSerialData = useCallback(
    async (port) => {
      const reader = port.readable.getReader();

      try {
        while (true) {
          const { value, done } = await reader.read();
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
        reader.releaseLock();
      }
    },
    [processSerialData]
  );

  const connectSerial = useCallback(async () => {
    try {
      const port = await navigator.serial.requestPort();
      await port.open({ baudRate: 9600 });
      setIsConnected(true);
      return port;
    } catch (error) {
      console.error("There was an error opening the serial port:", error);
    }
  }, [setIsConnected]);

  const autoConnectSerial = useCallback(
    async (vendorId, productId) => {
      try {
        const ports = await navigator.serial.getPorts();
        const targetPort = ports.find((port) => {
          const info = port.getInfo();
          return (
            info.usbVendorId === vendorId && info.usbProductId === productId
          );
        });

        if (targetPort) {
          console.log("Device found and attempting to connect...");
          await targetPort.open({ baudRate: 9600 });
          console.log("Connected to the specific USB device automatically.");
          setIsConnected(true);
          return targetPort;
        } else {
          console.log(
            "Specific USB device not found or not previously granted."
          );
        }
      } catch (error) {
        console.error(
          "There was an error connecting to the specific USB device:",
          error
        );
      }
    },
    [setIsConnected]
  );

  const startSerialCommunication = useCallback(async () => {
    const port = await connectSerial();
    if (port) {
      port.ondisconnect = () => {
        console.log("Device disconnected");
        setIsConnected(false);
      };
      await readSerialData(port);
    }
  }, [connectSerial, readSerialData, setIsConnected]);

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

    console.log("Web Serial API is supported!");
    autoConnectSerial(9025, 32822)
      .then((port) => {
        if (port) {
          readSerialData(port);
        }
      })
      .catch((error) => {
        console.error(error);
      });
  }, [autoConnectSerial, readSerialData, isSimulatorMode]);

  const connectButton = useMemo(
    () =>
      !isConnected &&
      !isSimulatorMode && (
        <button onClick={startSerialCommunication}>Connect</button>
      ),
    [isConnected, startSerialCommunication, isSimulatorMode]
  );

  return connectButton;
}

export default ReadSerialData;
