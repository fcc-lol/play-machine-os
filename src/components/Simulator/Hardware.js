import React from "react";
import { useSerial } from "../../SerialDataContext";
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

const SliderContainer = styled.div`
  margin: 0.625rem 0;
`;

const SliderLabel = styled.div`
  margin-bottom: 0.3125rem;
  font-size: 0.9rem;
`;

const Slider = styled.input`
  width: 100%;
  margin: 0.3125rem 0;
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

const KnobValue = styled.div`
  font-size: 0.8rem;
  margin-top: 0.3125rem;
`;

const buttons = [
  { id: "button_up", label: "↑", gridColumn: "5", gridRow: "1" },
  { id: "button_right", label: "→", gridColumn: "6", gridRow: "2" },
  { id: "button_down", label: "↓", gridColumn: "5", gridRow: "3" },
  { id: "button_left", label: "←", gridColumn: "4", gridRow: "2" },
  { id: "button_a", label: "A", gridColumn: "1", gridRow: "2" },
  { id: "button_b", label: "B", gridColumn: "2", gridRow: "2" }
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

const Hardware = () => {
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
            gridColumn={button.gridColumn}
            gridRow={button.gridRow}
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

export default Hardware;
