import React, { useEffect, useCallback, useRef } from "react";
import { useSerial } from "../../functions/SerialDataContext";
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
  width: 23rem;
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
  gap: 1.25rem;
  justify-content: center;
`;

const SliderContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;

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
  gap: 1rem;
`;

const Knob = styled.div`
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
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

const sliders = [
  { id: "vertical_slider_1", label: "Slider 1" },
  { id: "vertical_slider_2", label: "Slider 2" },
  { id: "vertical_slider_3", label: "Slider 3" }
];

const knobs = [
  { id: "knob_1", label: "Knob 1" },
  { id: "horizontal_slider", label: "Slider" },
  { id: "knob_2", label: "Knob 2" },
  { id: "knob_3", label: "Knob 3" },
  { id: "knob_4", label: "Knob 4" },
  { id: "knob_5", label: "Knob 5" }
];

const Hardware = () => {
  const { serialData, setSerialData, isSimulatorMode } = useSerial();
  const buttonStateRef = useRef({});
  const initializedRef = useRef(false);

  // Initialize serialData with localStorage values
  useEffect(() => {
    if (!isSimulatorMode || initializedRef.current) return;

    const allControls = [...sliders, ...knobs];
    const initialData = {};
    allControls.forEach((control) => {
      const savedValue = localStorage.getItem(`slider_${control.id}`);
      initialData[control.id] = {
        value: savedValue !== null ? parseInt(savedValue) : 0
      };
    });
    setSerialData(initialData);
    initializedRef.current = true;
  }, [setSerialData, isSimulatorMode]);

  const handleButtonDown = useCallback(
    (buttonId) => {
      if (!isSimulatorMode) return;

      buttonStateRef.current[buttonId] = true;
      setSerialData((prevData) => ({
        ...prevData,
        [buttonId]: { value: true }
      }));
    },
    [setSerialData, isSimulatorMode]
  );

  const handleButtonUp = useCallback(
    (buttonId) => {
      if (!isSimulatorMode) return;

      buttonStateRef.current[buttonId] = false;
      setSerialData((prevData) => ({
        ...prevData,
        [buttonId]: { value: false }
      }));
    },
    [setSerialData, isSimulatorMode]
  );

  const handleSliderChange = (sliderId, value) => {
    if (!isSimulatorMode) return;

    setSerialData((prevData) => ({
      ...prevData,
      [sliderId]: { value: parseInt(value) }
    }));
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
  }, [isSimulatorMode, handleButtonDown, handleButtonUp]);

  if (!isSimulatorMode) {
    return null;
  }

  return (
    <SimulatorContainer>
      <VerticalSlidersContainer>
        {sliders.map((slider) => (
          <SliderContainer key={slider.id} vertical={true}>
            <Label>{slider.label}</Label>
            <Slider
              type="range"
              min="0"
              max="100"
              value={serialData[slider.id]?.value || 0}
              onChange={(e) => handleSliderChange(slider.id, e.target.value)}
              vertical={true}
            />
            <Value>{serialData[slider.id]?.value || 0}%</Value>
          </SliderContainer>
        ))}
      </VerticalSlidersContainer>
      <KnobContainer>
        {knobs.map((knob) => (
          <Knob key={knob.id}>
            <Label>{knob.label}</Label>
            <Slider
              type="range"
              min="0"
              max="100"
              value={serialData[knob.id]?.value || 0}
              onChange={(e) => handleSliderChange(knob.id, e.target.value)}
            />
            <Value>{serialData[knob.id]?.value || 0}%</Value>
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
