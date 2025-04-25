import React, { useState, useCallback, useEffect } from "react";
import styled from "styled-components";
import { useSerial } from "../../../functions/SerialDataContext";

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  width: 100%;
  padding: 2rem;
  gap: 2rem;
`;

const SliderContainer = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 400px;
  gap: 1rem;
`;

const SliderLabel = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
`;

const Label = styled.span`
  font-size: 1.2rem;
  color: ${(props) => props.theme.text};
`;

const Value = styled.span`
  font-size: 1.2rem;
  color: ${(props) => props.theme.text};
  min-width: 3rem;
  text-align: right;
`;

const Slider = styled.input`
  width: 100%;
  height: 2rem;
  -webkit-appearance: none;
  background: ${(props) => props.theme.background};
  outline: none;
  border-radius: 1rem;
  overflow: hidden;

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 1.5rem;
    height: 1.5rem;
    border-radius: 50%;
    background: ${(props) => props.thumbColor || props.theme.primary};
    cursor: pointer;
    border: 2px solid ${(props) => props.theme.border};
    box-shadow: -407px 0 0 400px
      ${(props) => props.thumbColor || props.theme.primary};
  }
`;

const SendButton = styled.button`
  padding: 1rem 2rem;
  font-size: 1.2rem;
  background-color: ${(props) => props.theme.primary};
  color: ${(props) => props.theme.text};
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background-color: ${(props) => props.theme.primaryHover};
  }

  &:disabled {
    background-color: ${(props) => props.theme.disabled};
    cursor: not-allowed;
  }
`;

export default function OutputControl({ onBack }) {
  const { writeToOutputDeviceRef, isOutputConnected, serialData } = useSerial();
  const [red, setRed] = useState(10);
  const [green, setGreen] = useState(10);
  const [blue, setBlue] = useState(10);
  const [brightness, setBrightness] = useState(1);

  const sendData = useCallback(() => {
    if (writeToOutputDeviceRef.current && isOutputConnected) {
      writeToOutputDeviceRef.current(`${red},${green},${blue},${brightness}`);
    }
  }, [writeToOutputDeviceRef, isOutputConnected, red, green, blue, brightness]);

  // Update RGB values when vertical sliders change
  useEffect(() => {
    const verticalSlider1 = serialData.vertical_slider_1?.value;
    const verticalSlider2 = serialData.vertical_slider_2?.value;
    const verticalSlider3 = serialData.vertical_slider_3?.value;
    const horizontalSlider = serialData.horizontal_slider?.value;

    if (verticalSlider1 !== undefined) {
      // Map from 0-100 to 0-255
      const newRed = Math.round((verticalSlider1 / 100) * 255);
      if (newRed !== red) {
        setRed(newRed);
      }
    }

    if (verticalSlider2 !== undefined) {
      const newGreen = Math.round((verticalSlider2 / 100) * 255);
      if (newGreen !== green) {
        setGreen(newGreen);
      }
    }

    if (verticalSlider3 !== undefined) {
      const newBlue = Math.round((verticalSlider3 / 100) * 255);
      if (newBlue !== blue) {
        setBlue(newBlue);
      }
    }

    if (horizontalSlider !== undefined) {
      // Map from 0-100 to 1-10
      const newBrightness = Math.max(
        1,
        Math.round((horizontalSlider / 100) * 10)
      );
      if (newBrightness !== brightness) {
        setBrightness(newBrightness);
      }
    }

    // Send data whenever any slider changes
    if (
      verticalSlider1 !== undefined ||
      verticalSlider2 !== undefined ||
      verticalSlider3 !== undefined ||
      horizontalSlider !== undefined
    ) {
      sendData();
    }
  }, [serialData, red, green, blue, brightness, sendData]);

  return (
    <Container>
      <SliderContainer>
        <SliderLabel>
          <Label>Red</Label>
          <Value>{red}</Value>
        </SliderLabel>
        <Slider
          type="range"
          min="0"
          max="255"
          value={red}
          disabled
          thumbColor="#ff0000"
        />

        <SliderLabel>
          <Label>Green</Label>
          <Value>{green}</Value>
        </SliderLabel>
        <Slider
          type="range"
          min="0"
          max="255"
          value={green}
          disabled
          thumbColor="#00ff00"
        />

        <SliderLabel>
          <Label>Blue</Label>
          <Value>{blue}</Value>
        </SliderLabel>
        <Slider
          type="range"
          min="0"
          max="255"
          value={blue}
          disabled
          thumbColor="#0000ff"
        />

        <SliderLabel>
          <Label>Brightness</Label>
          <Value>{brightness}</Value>
        </SliderLabel>
        <Slider type="range" min="1" max="10" value={brightness} disabled />
      </SliderContainer>

      <SendButton disabled={!isOutputConnected}>
        {isOutputConnected ? "Device Connected" : "Device Not Connected"}
      </SendButton>
    </Container>
  );
}
