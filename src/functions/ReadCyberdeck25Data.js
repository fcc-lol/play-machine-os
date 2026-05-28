import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo
} from "react";
import { io } from "socket.io-client";
import styled from "styled-components";
import { useSerial } from "./SerialDataContext";
import hardware from "../config/Hardware.json";

const StatusBanner = styled.div`
  position: absolute;
  bottom: 1rem;
  left: 1rem;
  right: 1rem;
  background-color: rgba(0, 0, 0, 0.75);
  color: #ff4444;
  font-family: system-ui;
  font-size: 1rem;
  padding: 0.5rem 0.75rem;
  border-radius: 0.25rem;
  z-index: 1000;
  text-align: center;
  pointer-events: none;
`;

// Wrap a continuous encoder counter into the 0-100 range used by play-machine apps.
const wrapTo100 = (value, scale) => {
  const scaled = Math.round(value * scale);
  return ((scaled % 100) + 100) % 100;
};

function ReadCyberdeck25Data() {
  const {
    updateSerialData,
    setIsInputConnected,
    setIsOutputConnected,
    isSimulatorMode
  } = useSerial();

  const config = hardware.cyberdeck25;
  const encoderMap = useMemo(() => config?.encoders || {}, [config]);
  const switchMap = useMemo(() => config?.switches || {}, [config]);
  const keyLabel = config?.key || "button_a";
  const encoderScale = config?.encoderScale ?? 1;
  const socketUrl = config?.socket?.url || "http://localhost:3001";

  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);
  const updateSerialDataRef = useRef(updateSerialData);

  useEffect(() => {
    updateSerialDataRef.current = updateSerialData;
  }, [updateSerialData]);

  const writeEncoder = useCallback(
    (encoderId, rawValue) => {
      const labels = encoderMap[String(encoderId)] || [];
      if (labels.length === 0) return;
      const value = wrapTo100(rawValue, encoderScale);
      const payload = {};
      labels.forEach((label) => {
        payload[label] = { value };
      });
      updateSerialDataRef.current(payload);
    },
    [encoderMap, encoderScale]
  );

  const writeSwitch = useCallback(
    (switchName, active) => {
      const label = switchMap[switchName];
      if (!label) return;
      updateSerialDataRef.current({ [label]: { value: active === true } });
    },
    [switchMap]
  );

  const writeKey = useCallback(
    (active) => {
      if (!keyLabel) return;
      updateSerialDataRef.current({ [keyLabel]: { value: active === true } });
    },
    [keyLabel]
  );

  useEffect(() => {
    if (isSimulatorMode) return undefined;

    const socket = io(socketUrl, {
      transports: ["websocket", "polling"],
      reconnection: true
    });
    socketRef.current = socket;

    // Hardware side has no LED output device; mark output as connected so the
    // shared `isInputConnected && isOutputConnected` gate in App.js passes.
    setIsOutputConnected(true);

    socket.on("connect", () => {
      setConnected(true);
      setIsInputConnected(true);
    });

    socket.on("disconnect", () => {
      setConnected(false);
      setIsInputConnected(false);
    });

    socket.on("initial_state", (data) => {
      if (data?.key) writeKey(data.key.active);
      if (data?.switches) {
        Object.entries(data.switches).forEach(([name, state]) => {
          writeSwitch(name, state?.active);
        });
      }
      if (data?.encoders) {
        Object.entries(data.encoders).forEach(([id, value]) => {
          const raw = typeof value === "object" ? value.value : value;
          writeEncoder(id, raw || 0);
        });
      }
    });

    socket.on("key_change", (data) => writeKey(data?.active));
    socket.on("switch_change", (data) =>
      writeSwitch(data?.switch, data?.active)
    );
    socket.on("encoder_change", (data) =>
      writeEncoder(data?.encoder_id, data?.value ?? 0)
    );
    socket.on("encoder_button_press", (data) =>
      writeEncoder(data?.encoder_id, 0)
    );

    const keyMap = {
      ArrowUp: "button_up",
      ArrowDown: "button_down",
      ArrowLeft: "button_left",
      ArrowRight: "button_right",
      Enter: "button_a",
      Space: "button_a",
      Escape: "button_b"
    };

    const handleKey = (active) => (e) => {
      const label = keyMap[e.code] || keyMap[e.key];
      if (!label) return;
      e.preventDefault();
      if (e.repeat && active) return;
      updateSerialDataRef.current({ [label]: { value: active } });
    };
    const onKeyDown = handleKey(true);
    const onKeyUp = handleKey(false);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      socket.disconnect();
      socketRef.current = null;
      setIsInputConnected(false);
      setIsOutputConnected(false);
    };
  }, [
    isSimulatorMode,
    socketUrl,
    setIsInputConnected,
    setIsOutputConnected,
    writeEncoder,
    writeSwitch,
    writeKey
  ]);

  if (isSimulatorMode || connected) return null;

  return (
    <StatusBanner>
      Cyberdeck 25 bridge offline — start it on {socketUrl}
    </StatusBanner>
  );
}

export default ReadCyberdeck25Data;
