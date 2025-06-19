import React, { useEffect, useCallback, useRef, useState } from "react";
import { useSerial, ALL_CONTROLS } from "../../functions/SerialDataContext";
import styled from "styled-components";

const SimulatorContainer = styled.div`
  position: fixed;
  bottom: 1rem;
  right: 1rem;
  background: rgba(0, 0, 0, 0.9);
  padding: 2rem 3rem;
  border-radius: 0.5rem;
  color: #ffffff;
  font-family: system-ui;
  z-index: 1000;
  cursor: default;
  width: 25rem;
  font-family: monospace;
  text-transform: uppercase;
  gap: 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;

  * {
    outline: none;
  }
`;

const ButtonGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  grid-template-rows: repeat(3, 1fr);
  gap: 0;
  width: 19rem;
`;

const Button = styled.button`
  background: ${(props) => (props.active ? "#ffffff" : "transparent")};
  color: ${(props) => (props.active ? "#000000" : "#ffffff")};
  border: 0.125rem solid #ffffff;
  font-family: system-ui;
  font-size: 1.5rem;
  width: 3rem;
  height: 3rem;
  border-radius: 100%;
  cursor: pointer;
  font-weight: bold;
  transition: all 0.2s;
  grid-column: ${(props) => props.gridColumn || "auto"};
  grid-row: ${(props) => props.gridRow || "auto"};
  margin-right: ${(props) => (props.id === "button_b" ? "1rem" : "0")};

  &:hover {
    background: #ffffff;
    color: #000000;
  }
`;

const VerticalSlidersContainer = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: center;
`;

const SliderContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  border-radius: 0.25rem;
  border: 2px solid ${(props) => (props.isSelected ? "#ffffff" : "transparent")};

  ${(props) =>
    props.vertical &&
    `
    justify-content: center;
  `}
`;

const Slider = styled.input`
  width: 8rem;
  margin: 0.5rem 0;
  -webkit-appearance: none;
  background: transparent;

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 1.5rem;
    height: 100%;
    background: #ffffff;
    cursor: pointer;
  }

  &::-webkit-slider-runnable-track {
    width: 100%;
    height: 1.5rem;
    background: #000000;
    border: 0.125rem solid #ffffff;
    cursor: pointer;
  }

  ${(props) =>
    props.vertical &&
    `
    writing-mode: vertical-lr;
    direction: rtl;
    width: 1.5rem;
    height: 8rem;

    &::-webkit-slider-thumb {
      width: 100%;
      height: 1.5rem;
    }
  `}
`;

const KnobContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
`;

const Knob = styled.div`
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  border-radius: 0.25rem;
  border: 2px solid ${(props) => (props.isSelected ? "#ffffff" : "transparent")};
`;

const Label = styled.div`
  font-size: 1rem;
  text-align: center;
`;

const Value = styled.div`
  font-size: 1rem;
  font-weight: bold;
`;

const buttons = [
  { id: "button_up", label: "↑", gridColumn: "5", gridRow: "1" },
  { id: "button_right", label: "→", gridColumn: "6", gridRow: "2" },
  { id: "button_down", label: "↓", gridColumn: "5", gridRow: "3" },
  { id: "button_left", label: "←", gridColumn: "4", gridRow: "2" },
  { id: "button_a", label: "A", gridColumn: "2", gridRow: "2" },
  { id: "button_b", label: "B", gridColumn: "1", gridRow: "2" }
];

// Use the shared controls from context instead of local definitions
const sliders = ALL_CONTROLS.slice(0, 3); // First 3 are sliders
const knobs = ALL_CONTROLS.slice(3); // Rest are knobs

const Hardware = () => {
  const {
    serialData,
    setSerialData,
    updateSerialData,
    isSimulatorMode,
    selectedControl,
    hasActiveRemotes
  } = useSerial();
  const buttonStateRef = useRef({});
  const initializedRef = useRef(false);

  // Check for explicit simulator visibility control via URL parameter
  const [showSimulatorOverride, setShowSimulatorOverride] = useState(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const showSimulator = urlParams.get("showSimulator");
    setShowSimulatorOverride(showSimulator);
  }, []);

  // Determine if simulator should be visible
  // showSimulator parameter takes precedence over isSimulatorMode for visibility only
  const shouldShowSimulator =
    showSimulatorOverride !== null
      ? showSimulatorOverride === "true"
      : isSimulatorMode;

  // Initialize serialData with localStorage values
  useEffect(() => {
    if (!isSimulatorMode || initializedRef.current) return;

    const initialData = {};

    // Initialize sliders and knobs with localStorage values
    ALL_CONTROLS.forEach((control) => {
      const savedValue = localStorage.getItem(`slider_${control.id}`);
      initialData[control.id] = {
        value: savedValue !== null ? parseInt(savedValue) : 0
      };
    });

    // Initialize buttons with false values
    buttons.forEach((button) => {
      initialData[button.id] = { value: false };
    });

    // Initialize encoder button
    initialData.encoderButton = { value: false };

    setSerialData(initialData);
    initializedRef.current = true;
  }, [setSerialData, isSimulatorMode]);

  const handleEncoderButtonDown = useCallback(() => {
    if (!isSimulatorMode) return;

    updateSerialData({
      encoderButton: { value: true }
    });
  }, [updateSerialData, isSimulatorMode]);

  const handleEncoderButtonUp = useCallback(() => {
    if (!isSimulatorMode) return;

    updateSerialData({
      encoderButton: { value: false }
    });
  }, [updateSerialData, isSimulatorMode]);

  const handleButtonDown = useCallback(
    (buttonId) => {
      if (!isSimulatorMode) return;

      buttonStateRef.current[buttonId] = true;
      updateSerialData({
        [buttonId]: { value: true }
      });
    },
    [updateSerialData, isSimulatorMode]
  );

  const handleButtonUp = useCallback(
    (buttonId) => {
      if (!isSimulatorMode) return;

      buttonStateRef.current[buttonId] = false;
      updateSerialData({
        [buttonId]: { value: false }
      });
    },
    [updateSerialData, isSimulatorMode]
  );

  const handleSliderChange = (sliderId, value) => {
    if (!isSimulatorMode) return;

    updateSerialData({
      [sliderId]: { value: parseInt(value) }
    });
    localStorage.setItem(`slider_${sliderId}`, value);
  };

  useEffect(() => {
    if (!isSimulatorMode) return;

    const handleKeyDown = (e) => {
      switch (e.key) {
        case "ArrowUp":
          if (!buttonStateRef.current["button_up"])
            handleButtonDown("button_up");
          break;
        case "ArrowRight":
          if (!buttonStateRef.current["button_right"])
            handleButtonDown("button_right");
          break;
        case "ArrowDown":
          if (!buttonStateRef.current["button_down"])
            handleButtonDown("button_down");
          break;
        case "ArrowLeft":
          if (!buttonStateRef.current["button_left"])
            handleButtonDown("button_left");
          break;
        case "Enter":
          if (!buttonStateRef.current["button_a"]) handleButtonDown("button_a");
          break;
        case "Escape":
          if (!buttonStateRef.current["button_b"]) handleButtonDown("button_b");
          break;
        case "Delete":
        case "Backspace":
          e.preventDefault();
          if (!buttonStateRef.current["button_b"]) handleButtonDown("button_b");
          break;
        case " ": // Spacebar for encoder button (only when remotes are active)
          if (hasActiveRemotes) {
            e.preventDefault();
            handleEncoderButtonDown();
          }
          break;
        default:
          break;
      }
    };

    const handleKeyUp = (e) => {
      switch (e.key) {
        case "ArrowUp":
          if (buttonStateRef.current["button_up"]) handleButtonUp("button_up");
          break;
        case "ArrowRight":
          if (buttonStateRef.current["button_right"])
            handleButtonUp("button_right");
          break;
        case "ArrowDown":
          if (buttonStateRef.current["button_down"])
            handleButtonUp("button_down");
          break;
        case "ArrowLeft":
          if (buttonStateRef.current["button_left"])
            handleButtonUp("button_left");
          break;
        case "Enter":
          if (buttonStateRef.current["button_a"]) handleButtonUp("button_a");
          break;
        case "Escape":
          if (buttonStateRef.current["button_b"]) handleButtonUp("button_b");
          break;
        case "Delete":
        case "Backspace":
          e.preventDefault();
          if (buttonStateRef.current["button_b"]) handleButtonUp("button_b");
          break;
        case " ": // Spacebar for encoder button (only when remotes are active)
          if (hasActiveRemotes) {
            e.preventDefault();
            handleEncoderButtonUp();
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [
    isSimulatorMode,
    handleButtonDown,
    handleButtonUp,
    handleEncoderButtonDown,
    handleEncoderButtonUp,
    hasActiveRemotes
  ]);

  if (!shouldShowSimulator) {
    return null;
  }

  // Only show selection highlighting when remotes are active
  const showSelection = hasActiveRemotes && selectedControl;

  return (
    <SimulatorContainer>
      <VerticalSlidersContainer>
        {sliders.map((slider) => (
          <SliderContainer
            key={slider.id}
            vertical={true}
            isSelected={showSelection && selectedControl?.id === slider.id}
          >
            <Label
              isSelected={showSelection && selectedControl?.id === slider.id}
            >
              {slider.label}
            </Label>
            <Slider
              type="range"
              min="0"
              max="100"
              value={serialData[slider.id]?.value || 0}
              onChange={(e) => handleSliderChange(slider.id, e.target.value)}
              vertical={true}
              isSelected={showSelection && selectedControl?.id === slider.id}
            />
            <Value
              isSelected={showSelection && selectedControl?.id === slider.id}
            >
              {serialData[slider.id]?.value || 0}%
            </Value>
          </SliderContainer>
        ))}
      </VerticalSlidersContainer>
      <KnobContainer>
        {knobs.map((knob) => (
          <Knob
            key={knob.id}
            isSelected={showSelection && selectedControl?.id === knob.id}
          >
            <Label
              isSelected={showSelection && selectedControl?.id === knob.id}
            >
              {knob.label}
            </Label>
            <Slider
              type="range"
              min="0"
              max="100"
              value={serialData[knob.id]?.value || 0}
              onChange={(e) => handleSliderChange(knob.id, e.target.value)}
              isSelected={showSelection && selectedControl?.id === knob.id}
            />
            <Value
              isSelected={showSelection && selectedControl?.id === knob.id}
            >
              {serialData[knob.id]?.value || 0}%
            </Value>
          </Knob>
        ))}
      </KnobContainer>
      <ButtonGrid>
        {buttons.map((button) => (
          <Button
            key={button.id}
            id={button.id}
            active={serialData[button.id]?.value || false}
            onMouseDown={() => handleButtonDown(button.id)}
            onMouseUp={() => handleButtonUp(button.id)}
            onMouseLeave={() => handleButtonUp(button.id)}
            gridColumn={button.gridColumn}
            gridRow={button.gridRow}
          >
            {button.label}
          </Button>
        ))}
      </ButtonGrid>
    </SimulatorContainer>
  );
};

export default Hardware;
