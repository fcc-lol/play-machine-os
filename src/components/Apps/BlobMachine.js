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

const BlobMachine = () => {
  const { serialData } = useSerial();

  return (
    <Root>
      <Circle
        size={ConvertRange(serialData.horizontal_slider.value, 100, 500)}
      />
      <pre>
        {JSON.stringify(
          {
            verticalSlider1: serialData.vertical_slider_1.value,
            verticalSlider2: serialData.vertical_slider_2.value,
            verticalSlider3: serialData.vertical_slider_3.value,
            knob1: serialData.knob_1.value,
            horizontalSlider: serialData.horizontal_slider.value,
            knob2: serialData.knob_2.value,
            knob3: serialData.knob_3.value,
            knob4: serialData.knob_4.value,
            knob5: serialData.knob_5.value,
            buttonA: serialData.button_a.value,
            buttonB: serialData.button_b.value,
            buttonUp: serialData.button_up.value,
            buttonDown: serialData.button_down.value,
            buttonLeft: serialData.button_left.value,
            buttonRight: serialData.button_right.value,
          },
          null,
          2
        )}
      </pre>
    </Root>
  );
};

export default BlobMachine;
