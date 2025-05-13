import styled from "styled-components";
import { useSerial } from "../../functions/SerialDataContext";
import { useMemo, useEffect, useRef } from "react";
import ConvertRange from "../../functions/ConvertRange";

const Root = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  height: calc(100%);
  width: calc(100%);
  background-color: ${(props) => props.theme.background};
  color: ${(props) => props.theme.text};
  font-family: ${(props) => props.theme.fontFamily};
  font-size: 1.25rem;

  pre {
    margin: 0;
    padding: 0;
  }
  canvas {
    width: 100%;
    height: 100%;
  }
`;

const RainMachine = () => {
  const { serialData } = useSerial();

  const canvasRef = useRef(null);
  const baseCellSize = 32;
  const basePixelSize = 2; // Base pixel size for better performance
  const offsetRef = useRef(0);

  const sliders = useMemo(() => {
    // Calculate sizes based on fixed increments
    const scaleFactor = ConvertRange(
      serialData.vertical_slider_3.value,
      0.125,
      1
    );

    const cellSizeIndex = Math.floor(scaleFactor * 8);
    const cellSize = baseCellSize * Math.pow(2, cellSizeIndex);

    const pixelSizeIndex = Math.floor(scaleFactor * 8);
    const pixelSize = basePixelSize * Math.pow(2, pixelSizeIndex);

    return {
      iMult: ConvertRange(serialData.knob_1.value, 0, 2),
      jMult: ConvertRange(serialData.knob_2.value, 0, 2),
      exprMult: ConvertRange(serialData.knob_3.value, 0, 128),
      modVal: ConvertRange(serialData.knob_4.value, 0, 128),
      threshold: ConvertRange(serialData.knob_5.value, 0, 1),
      speed: ConvertRange(serialData.horizontal_slider.value, 0, 0.1),
      hue: ConvertRange(serialData.vertical_slider_1.value, 180, -180),
      backgroundHue: ConvertRange(serialData.vertical_slider_2.value, 0, 360),
      cellSize,
      pixelSize,
    };
  }, [serialData]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    // Create an offscreen canvas for better performance
    const offscreenCanvas = document.createElement("canvas");
    offscreenCanvas.width = canvas.width;
    offscreenCanvas.height = canvas.height;
    const offscreenCtx = offscreenCanvas.getContext("2d");

    function drawPattern() {
      const {
        iMult,
        jMult,
        exprMult,
        modVal,
        threshold,
        hue,
        backgroundHue,
        cellSize,
        pixelSize,
      } = sliders;

      // Set background color based on button state
      if (serialData.button_down.value === true) {
        offscreenCtx.fillStyle = "black";
      } else {
        offscreenCtx.fillStyle = `hsl(${backgroundHue}, 100%, 50%)`;
      }
      offscreenCtx.fillRect(0, 0, canvas.width, canvas.height);

      // Pre-calculate some values
      const sinWaveMultiplier = 0.1;
      const halfModVal = modVal / 2;

      // Draw in larger blocks for better performance
      for (let y = 0; y < canvas.height; y += cellSize) {
        for (let x = 0; x < canvas.width; x += cellSize) {
          for (let j = 0; j < cellSize; j += pixelSize) {
            for (let i = 0; i < cellSize; i += pixelSize) {
              const animatedJ = (j - offsetRef.current + cellSize) % cellSize;

              // Simplified calculations
              const baseExpression = (iMult * i + jMult * animatedJ) * exprMult;
              const sinWave =
                Math.sin((i * jMult + animatedJ * iMult) * sinWaveMultiplier) *
                  halfModVal +
                halfModVal;
              const expression = (baseExpression + sinWave) % modVal;

              if (expression / modVal < threshold) {
                // Set foreground color based on button state
                if (serialData.button_up.value === true) {
                  offscreenCtx.fillStyle = "white";
                } else {
                  offscreenCtx.fillStyle = `hsl(${hue}, 100%, 50%)`;
                }
                offscreenCtx.fillRect(x + i, y + j, pixelSize, pixelSize);
              }
            }
          }
        }
      }

      // Copy the offscreen canvas to the main canvas
      ctx.drawImage(offscreenCanvas, 0, 0);
    }

    let animationFrameId;
    function animate() {
      if (sliders.speed > 0) {
        offsetRef.current =
          (offsetRef.current + sliders.speed) % sliders.cellSize;
      }
      drawPattern();
      animationFrameId = requestAnimationFrame(animate);
    }

    animate();

    // Cleanup
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [sliders]);

  return (
    <Root>
      <canvas ref={canvasRef} width={1024} height={600} id='patternCanvas' />
    </Root>
  );
};

export default RainMachine;
