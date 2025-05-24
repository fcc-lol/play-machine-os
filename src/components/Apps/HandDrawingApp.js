import React, { useEffect, useRef } from "react";
import styled from "styled-components";
import { useHandDetection } from "../../functions/HandDetectionContext";
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

const Video = styled.video`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: ${(props) => props.opacity};
`;

const HandDrawingApp = () => {
  const { videoRef, landmarks } = useHandDetection();
  const { serialData } = useSerial();
  const drawingCanvasRef = useRef(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef(null);

  useEffect(() => {
    const canvas = drawingCanvasRef.current;
    const ctx = canvas.getContext("2d");

    // Set canvas dimensions
    const setCanvasDimensions = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };

    setCanvasDimensions();

    // Get color from knob_1
    const getColor = () => {
      const knobValue = serialData.knob_1?.value || 0;
      const hue = (knobValue / 100) * 360;
      return `hsl(${hue}, 100%, 50%)`;
    };

    // Get line width from knob_2
    const getLineWidth = () => {
      const knobValue = serialData.knob_2?.value || 0;
      return (knobValue / 100) * 20 + 1; // Line width from 1 to 21
    };

    // Get opacity from vertical_slider_1
    const getOpacity = () => {
      return (serialData.vertical_slider_1?.value || 0) / 100;
    };

    const draw = () => {
      // Clear canvas with opacity
      ctx.fillStyle = `rgba(0, 0, 0, ${getOpacity()})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Find index finger tip (point 8)
      const indexFinger = landmarks.find(
        (point) => point.point === 8 && point.hand === 1
      );

      if (indexFinger) {
        const currentPoint = {
          x: indexFinger.x,
          y: indexFinger.y
        };

        // Check if we should start/stop drawing based on pinch gesture
        const thumbTip = landmarks.find(
          (point) => point.point === 4 && point.hand === 1
        );

        if (thumbTip) {
          const distance = Math.sqrt(
            Math.pow(thumbTip.x - indexFinger.x, 2) +
              Math.pow(thumbTip.y - indexFinger.y, 2)
          );

          // Start drawing when fingers are close (pinch)
          if (distance < 30) {
            isDrawingRef.current = true;
          } else {
            isDrawingRef.current = false;
            lastPointRef.current = null;
          }
        }

        // Draw line if we're in drawing mode
        if (isDrawingRef.current && lastPointRef.current) {
          ctx.beginPath();
          ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
          ctx.lineTo(currentPoint.x, currentPoint.y);
          ctx.strokeStyle = getColor();
          ctx.lineWidth = getLineWidth();
          ctx.lineCap = "round";
          ctx.stroke();
        }

        lastPointRef.current = currentPoint;
      }

      requestAnimationFrame(draw);
    };

    draw();

    // Clear canvas when button_a is pressed
    if (serialData.button_a?.value === true) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, [landmarks, serialData]);

  return (
    <AppContainer>
      <Video
        ref={videoRef}
        autoPlay
        playsInline
        opacity={(serialData.vertical_slider_1?.value || 0) / 100}
      />
      <Canvas ref={drawingCanvasRef} />
    </AppContainer>
  );
};

export default HandDrawingApp;
