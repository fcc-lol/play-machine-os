import React, { useEffect, useRef } from "react";
import styled from "styled-components";
import { useSerial } from "../../functions/SerialDataContext";
import ConvertRange from "../../functions/ConvertRange";

const Root = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  height: calc(100% - 4rem);
  width: calc(100% - 4rem);
  padding: 2rem;
  background-color: ${(props) => props.theme.background};
  color: ${(props) => props.theme.text};
  font-family: ${(props) => props.theme.fontFamily};
  font-size: 1.25rem;

  pre {
    margin: 0;
    padding: 0;
  }
`;

const Circle = styled.div`
  position: absolute;
  right: 2rem;
  top: 2rem;
  width: ${(props) => props.size}px;
  height: ${(props) => props.size}px;
  border-radius: 50%;
  background-color: ${(props) => props.theme.text};
`;

const AppTemplate = () => {
  const { serialData } = useSerial();
  const serialDataRef = useRef(serialData);

  useEffect(() => {
    serialDataRef.current = serialData;
  }, [serialData]);

  // Create display data with readable names - always show all keys
  const displayData = {
    verticalSlider1: serialData.vertical_slider_1?.value ?? null,
    verticalSlider2: serialData.vertical_slider_2?.value ?? null,
    verticalSlider3: serialData.vertical_slider_3?.value ?? null,
    knob1: serialData.knob_1?.value ?? null,
    horizontalSlider: serialData.horizontal_slider?.value ?? null,
    knob2: serialData.knob_2?.value ?? null,
    knob3: serialData.knob_3?.value ?? null,
    knob4: serialData.knob_4?.value ?? null,
    knob5: serialData.knob_5?.value ?? null,
    buttonA: serialData.button_a?.value ?? false,
    buttonB: serialData.button_b?.value ?? false,
    buttonUp: serialData.button_up?.value ?? false,
    buttonDown: serialData.button_down?.value ?? false,
    buttonLeft: serialData.button_left?.value ?? false,
    buttonRight: serialData.button_right?.value ?? false
  };

  return (
    <Root>
      <Circle
        size={
          serialData.horizontal_slider?.value
            ? ConvertRange(serialData.horizontal_slider.value, 100, 500)
            : 100
        }
      />
      <pre>{JSON.stringify(displayData, null, 2)}</pre>
    </Root>
  );
};

export default AppTemplate;
