import React from "react";
import { useSerial } from "../SerialDataContext";
import styled from "styled-components";

const SimulatorContainer = styled.div`
  position: fixed;
  bottom: 20px;
  right: 20px;
  background: rgba(0, 0, 0, 0.8);
  padding: 20px;
  border-radius: 10px;
  color: #00ff00;
  font-family: "Courier New", monospace;
  z-index: 1000;
  cursor: default;
`;

const ButtonGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 20px;
`;

const SimButton = styled.button`
  background: ${(props) => (props.active ? "#00ff00" : "#333")};
  color: ${(props) => (props.active ? "#000" : "#00ff00")};
  border: 2px solid #00ff00;
  padding: 10px;
  cursor: pointer;
  font-family: "Courier New", monospace;
  font-weight: bold;
  transition: all 0.2s;

  &:hover {
    background: #00ff00;
    color: #000;
  }
`;

const SliderContainer = styled.div`
  margin: 10px 0;
`;

const SliderLabel = styled.div`
  margin-bottom: 5px;
  font-size: 0.9em;
`;

const Slider = styled.input`
  width: 100%;
  margin: 5px 0;
`;

const KnobContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-top: 20px;
`;

const Knob = styled.div`
  text-align: center;
`;

const KnobValue = styled.div`
  font-size: 0.8em;
  margin-top: 5px;
`;

const Simulator = () => {
  const { serialData, setSerialData, isSimulatorMode } = useSerial();

  if (!isSimulatorMode) {
    return null;
  }

  const handleButtonDown = (buttonId) => {
    const newData = { ...serialData };
    newData[buttonId] = { value: true };
    setSerialData(newData);
  };

  const handleButtonUp = (buttonId) => {
    const newData = { ...serialData };
    newData[buttonId] = { value: false };
    setSerialData(newData);
  };

  const handleSliderChange = (sliderId, value) => {
    const newData = { ...serialData };
    newData[sliderId] = { value: parseInt(value) };
    setSerialData(newData);
  };

  const buttons = [
    { id: "button_up", label: "↑" },
    { id: "button_right", label: "→" },
    { id: "button_down", label: "↓" },
    { id: "button_left", label: "←" },
    { id: "button_a", label: "A" },
    { id: "button_b", label: "B" }
  ];

  const sliders = [
    { id: "vertical_slider_1", label: "Vertical Slider 1" },
    { id: "vertical_slider_2", label: "Vertical Slider 2" },
    { id: "vertical_slider_3", label: "Vertical Slider 3" },
    { id: "horizontal_slider", label: "Horizontal Slider" }
  ];

  const knobs = [
    { id: "knob_1", label: "Knob 1" },
    { id: "knob_2", label: "Knob 2" },
    { id: "knob_3", label: "Knob 3" },
    { id: "knob_4", label: "Knob 4" },
    { id: "knob_5", label: "Knob 5" }
  ];

  return (
    <SimulatorContainer>
      <h3>Hardware Simulator</h3>

      <ButtonGrid>
        {buttons.map((button) => (
          <SimButton
            key={button.id}
            active={serialData[button.id]?.value || false}
            onMouseDown={() => handleButtonDown(button.id)}
            onMouseUp={() => handleButtonUp(button.id)}
            onMouseLeave={() => handleButtonUp(button.id)}
          >
            {button.label}
          </SimButton>
        ))}
      </ButtonGrid>

      {sliders.map((slider) => (
        <SliderContainer key={slider.id}>
          <SliderLabel>{slider.label}</SliderLabel>
          <Slider
            type="range"
            min="0"
            max="100"
            value={serialData[slider.id]?.value || 0}
            onChange={(e) => handleSliderChange(slider.id, e.target.value)}
          />
        </SliderContainer>
      ))}

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
            <KnobValue>
              {knob.label}: {serialData[knob.id]?.value || 0}%
            </KnobValue>
          </Knob>
        ))}
      </KnobContainer>
    </SimulatorContainer>
  );
};

export default Simulator;
