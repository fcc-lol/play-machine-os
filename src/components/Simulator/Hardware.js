import React, { useEffect, useCallback } from "react";
import { useSerial } from "../../functions/SerialDataContext";
import styled from "styled-components";

const SimulatorContainer = styled.div`
  position: fixed;
  bottom: 1.25rem;
  right: 1.25rem;
  background: rgba(0, 0, 0, 0.9);
  padding: 1.25rem;
  border-radius: 0.625rem;
  color: #ffffff;
  font-family: system-ui;
  z-index: 1000;
  cursor: default;
  width: 24rem;
  font-family: monospace;
  text-transform: uppercase;
`;

const ButtonGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  grid-template-rows: repeat(3, 1fr);
  gap: 0.625rem;
  margin-bottom: 1.25rem;
  width: 18.75rem;
  margin: 0 auto 1.25rem;
`;

const SimButton = styled.button`
  background: ${(props) => (props.active ? "#ffffff" : "#333333")};
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

  &:hover {
    background: #ffffff;
    color: #000000;
  }
`;

const VerticalSlidersContainer = styled.div`
  display: flex;
  gap: 1.25rem;
  justify-content: center;
  margin-bottom: 1.25rem;
`;

const SliderContainer = styled.div`
  margin: 0.625rem 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  ${(props) =>
    props.vertical &&
    `
    height: 12rem;
    justify-content: center;
  `}
`;

const Slider = styled.input`
  width: 100%;
  margin: 0.5rem 0;
  ${(props) =>
    props.vertical &&
    `
    writing-mode: bt-lr;
    -webkit-appearance: slider-vertical;
    width: 1rem;
    height: 8rem;
    padding: 0 1rem;

  `}
`;

const KnobContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.625rem;
  margin-top: 1.25rem;
`;

const Knob = styled.div`
  text-align: center;
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

  // Initialize serialData with localStorage values
  useEffect(() => {
    const allControls = [...sliders, ...knobs];
    const initialData = {};
    allControls.forEach((control) => {
      const savedValue = localStorage.getItem(`slider_${control.id}`);
      initialData[control.id] = {
        value: savedValue !== null ? parseInt(savedValue) : 0
      };
    });
    setSerialData(initialData);
  }, [setSerialData]);

  const handleButtonDown = useCallback(
    (buttonId) => {
      const newData = { ...serialData };
      newData[buttonId] = { value: true };
      setSerialData(newData);
    },
    [serialData, setSerialData]
  );

  const handleButtonUp = useCallback(
    (buttonId) => {
      const newData = { ...serialData };
      newData[buttonId] = { value: false };
      setSerialData(newData);
    },
    [serialData, setSerialData]
  );

  const handleSliderChange = (sliderId, value) => {
    const newData = { ...serialData };
    newData[sliderId] = { value: parseInt(value) };
    setSerialData(newData);
    if (isSimulatorMode) {
      localStorage.setItem(`slider_${sliderId}`, value);
    }
  };

  useEffect(() => {
    if (!isSimulatorMode) return;

    const handleKeyDown = (e) => {
      console.log("Key pressed:", e.key);
      switch (e.key) {
        case "ArrowUp":
          handleButtonDown("button_up");
          break;
        case "ArrowRight":
          handleButtonDown("button_right");
          break;
        case "ArrowDown":
          handleButtonDown("button_down");
          break;
        case "ArrowLeft":
          handleButtonDown("button_left");
          break;
        case "Enter":
          handleButtonDown("button_a");
          break;
        case "Escape":
          handleButtonDown("button_b");
          break;
        case "Delete":
        case "Backspace":
          e.preventDefault();
          handleButtonDown("button_b");
          break;
        default:
          break;
      }
    };

    const handleKeyUp = (e) => {
      console.log("Key released:", e.key);
      switch (e.key) {
        case "ArrowUp":
          handleButtonUp("button_up");
          break;
        case "ArrowRight":
          handleButtonUp("button_right");
          break;
        case "ArrowDown":
          handleButtonUp("button_down");
          break;
        case "ArrowLeft":
          handleButtonUp("button_left");
          break;
        case "Enter":
          handleButtonUp("button_a");
          break;
        case "Escape":
          handleButtonUp("button_b");
          break;
        case "Delete":
        case "Backspace":
          e.preventDefault();
          handleButtonUp("button_b");
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
  }, [serialData, isSimulatorMode, handleButtonDown, handleButtonUp]);

  if (!isSimulatorMode) {
    return null;
  }

  return (
    <SimulatorContainer>
      <ButtonGrid>
        {buttons.map((button) => (
          <SimButton
            key={button.id}
            active={serialData[button.id]?.value || false}
            onMouseDown={() => handleButtonDown(button.id)}
            onMouseUp={() => handleButtonUp(button.id)}
            onMouseLeave={() => handleButtonUp(button.id)}
            gridColumn={button.gridColumn}
            gridRow={button.gridRow}
          >
            {button.label}
          </SimButton>
        ))}
      </ButtonGrid>

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
            <Slider
              type="range"
              min="0"
              max="100"
              value={serialData[knob.id]?.value || 0}
              onChange={(e) => handleSliderChange(knob.id, e.target.value)}
            />
            <Label>{knob.label}</Label>
            <Value>{serialData[knob.id]?.value || 0}%</Value>
          </Knob>
        ))}
      </KnobContainer>
    </SimulatorContainer>
  );
};

export default Hardware;
