import React, { useEffect, useRef, useMemo } from "react";
import styled from "styled-components";
import { useSerial } from "../../functions/SerialDataContext";

const AppContainer = styled.div`
  background-color: #000000;
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
`;

const Canvas = styled.canvas`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
`;

const createBlob = (params = {}) => {
  const {
    xFreq = 0.5,
    yFreq = 0.3,
    color = "#4CAF50",
    size = 25,
    slider = "vertical_slider_1",
    colorKnob = "knob_3"
  } = params;

  return {
    xFreq,
    yFreq,
    color,
    size,
    slider,
    colorKnob,
    time: 0
  };
};

const App1 = () => {
  const { serialData } = useSerial();
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  const blobs = useMemo(
    () => [
      createBlob({
        color: "red",
        xFreq: 0.5,
        yFreq: 0.3,
        slider: "vertical_slider_1",
        colorKnob: "knob_3"
      }),
      createBlob({
        color: "green",
        xFreq: 0.3,
        yFreq: 0.5,
        slider: "vertical_slider_2",
        colorKnob: "knob_4"
      }),
      createBlob({
        color: "blue",
        xFreq: 0.4,
        yFreq: 0.4,
        slider: "vertical_slider_3",
        colorKnob: "knob_5"
      })
    ],
    []
  );

  const blobsRef = useRef(blobs);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    // Function to set canvas dimensions
    const setCanvasDimensions = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };

    // Set initial dimensions
    setCanvasDimensions();

    const draw = () => {
      // Get background color from horizontal slider
      const bgValue = serialData.horizontal_slider?.value || 0;
      const scaledValue = Math.round((bgValue / 100) * 255); // Scale to 0-255 range
      const bgColor = `rgb(${scaledValue}, ${scaledValue}, ${scaledValue})`;

      // Clear canvas with dynamic background color
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Get blur amount from knob_2
      const blurAmount = serialData.knob_2?.value || 0;
      const blurValue = Math.round((blurAmount / 100) * 1000); // Scale to 0-1000px range
      ctx.filter = `blur(${blurValue}px)`;

      // Set blend mode
      // ctx.globalCompositeOperation = "hard-light";

      // Get size multiplier from knob_1
      const sizeMultiplier = (serialData.knob_1?.value || 3) / 5 + 0.4; // Minimum size at knob_1 = 0 will be 0.4x, maximum at 100 will be 20.4x

      // Draw each blob
      blobsRef.current.forEach((blob) => {
        const margin = blob.size * sizeMultiplier;
        const maxX =
          canvas.width / (window.devicePixelRatio || 1) -
          blob.size * 2 * sizeMultiplier;
        const maxY =
          canvas.height / (window.devicePixelRatio || 1) -
          blob.size * 2 * sizeMultiplier;

        // Get speed from the specified slider
        const sliderValue = serialData[`${blob.slider}`]?.value || 0;
        const speed = sliderValue / 100;

        // Get color from the specified knob
        const knobValue = serialData[`${blob.colorKnob}`]?.value || 0;
        const hue = (knobValue / 100) * 360; // Convert knob value to hue (0-360)
        const color = `hsl(${hue}, 100%, 50%)`; // Full saturation and medium lightness

        // Only update time if speed is not 0
        if (speed > 0) {
          blob.time += 0.05 * speed;
        }

        const x =
          margin +
          (Math.sin(blob.time * blob.xFreq) * (maxX - margin * 2) + maxX) / 2;
        const y =
          margin +
          (Math.sin(blob.time * blob.yFreq) * (maxY - margin * 2) + maxY) / 2;

        // Draw blob with scaled size
        ctx.beginPath();
        ctx.arc(x, y, blob.size * sizeMultiplier, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
      });

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [serialData]);

  return (
    <AppContainer>
      <Canvas ref={canvasRef} />
    </AppContainer>
  );
};

export default App1;
