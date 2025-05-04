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
  gap: 2rem;
`;

const Values = styled.div`
  display: flex;
  flex-direction: row;
  width: 100%;
  flex: 1;
  gap: 1rem;
`;

const ValueContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  background: ${(props) => props.theme.background};
  gap: 2rem;
  padding-top: 2rem;
`;

const Label = styled.span`
  font-size: 1.125rem;
  color: ${(props) => props.theme.text};
`;

const Value = styled.span`
  font-size: 1.125rem;
  color: ${(props) => props.theme.text};
`;

const ColorDisplay = styled.div`
  width: 100%;
  height: calc(100% - 2rem);
  background: ${(props) => props.color};
  opacity: ${(props) => props.opacity};
`;

export default function LEDController({ onBack }) {
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
      const newBrightness = Math.max(
        1,
        Math.round((horizontalSlider / 100) * 10)
      );
      if (newBrightness !== brightness) {
        setBrightness(newBrightness);
      }
    }

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
      <Values>
        <ValueContainer>
          <Label>Red</Label>
          <Value>{red}</Value>
          <ColorDisplay color="#ff0000" opacity={red / 255} />
        </ValueContainer>
        <ValueContainer>
          <Label>Green</Label>
          <Value>{green}</Value>
          <ColorDisplay color="#00ff00" opacity={green / 255} />
        </ValueContainer>
        <ValueContainer>
          <Label>Blue</Label>
          <Value>{blue}</Value>
          <ColorDisplay color="#0000ff" opacity={blue / 255} />
        </ValueContainer>
        <ValueContainer>
          <Label>Brightness</Label>
          <Value>{brightness}</Value>
          <ColorDisplay color="#ffffff" opacity={brightness / 10} />
        </ValueContainer>
      </Values>
    </Container>
  );
}
