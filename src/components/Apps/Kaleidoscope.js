import React, { useRef, useEffect, useCallback } from "react";
import styled from "styled-components";
import { useSerial } from "../../functions/SerialDataContext";
import ConvertRange from "../../functions/ConvertRange";

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

export default function Kaleidoscope() {
  const { serialData } = useSerial();
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  // Convert HSV to RGB
  const hsvToRgb = (h, s, v) => {
    const c = (v / 100) * (s / 100);
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = v / 100 - c;

    let r, g, b;
    if (h >= 0 && h < 60) {
      r = c;
      g = x;
      b = 0;
    } else if (h >= 60 && h < 120) {
      r = x;
      g = c;
      b = 0;
    } else if (h >= 120 && h < 180) {
      r = 0;
      g = c;
      b = x;
    } else if (h >= 180 && h < 240) {
      r = 0;
      g = x;
      b = c;
    } else if (h >= 240 && h < 300) {
      r = x;
      g = 0;
      b = c;
    } else {
      r = c;
      g = 0;
      b = x;
    }

    return {
      r: Math.round((r + m) * 255),
      g: Math.round((g + m) * 255),
      b: Math.round((b + m) * 255)
    };
  };

  const animate = useCallback(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      const t = Date.now();

      // Clear canvas
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Get control values
      const rValue = serialData.vertical_slider_1?.value || 50;
      const gValue = serialData.vertical_slider_2?.value || 50;
      const bValue = serialData.vertical_slider_3?.value || 50;
      const hValue = serialData.horizontal_slider?.value || 50;
      const knob1Value = serialData.knob_1?.value || 50;
      const knob2Value = serialData.knob_2?.value || 50;
      const knob3Value = serialData.knob_3?.value || 50;
      const knob4Value = serialData.knob_4?.value || 50;
      const knob5Value = serialData.knob_5?.value || 50;

      // Convert controls to pattern parameters for different sections
      const centerHue = ConvertRange(rValue, 0, 360);
      const middleHue = ConvertRange(gValue, 0, 360);
      const outerHue = ConvertRange(bValue, 0, 360);

      // Animation speed from horizontal slider
      const animationSpeed = ConvertRange(hValue, 0.001, 0.02);

      // Resolution from knob 4 (affects grid size)
      const resolution = ConvertRange(knob4Value, 0.5, 2.0);

      // Seed values from knobs 1, 2, 3, 5
      const seed1 = ConvertRange(knob1Value, 0, 100);
      const seed2 = ConvertRange(knob2Value, 0, 100);
      const seed3 = ConvertRange(knob3Value, 0, 100);
      const seed4 = ConvertRange(knob5Value, 0, 100);

      // Calculate grid dimensions based on resolution
      const gridSize = Math.floor(13 * resolution);
      const centerX = Math.floor(gridSize / 2);
      const centerY = Math.floor(gridSize / 2);

      // Draw center pixel using slider 1
      const centerColor = hsvToRgb(centerHue, 80, 90);
      ctx.fillStyle = `rgb(${centerColor.r}, ${centerColor.g}, ${centerColor.b})`;
      const cellWidth = canvas.width / gridSize;
      const cellHeight = canvas.height / gridSize;
      ctx.fillRect(
        centerX * cellWidth,
        centerY * cellHeight,
        cellWidth,
        cellHeight
      );

      // Draw pattern
      let pixelsDrawn = 1;
      for (let y = 0; y <= centerY; y++) {
        for (let x = 0; x <= centerX; x++) {
          if (x === centerX && y === centerY) continue;

          // Calculate distance from center
          const dx = Math.abs(x - centerX);
          const dy = Math.abs(y - centerY);
          const distance = Math.sqrt(dx * dx + dy * dy);

          // Apply animation
          const animatedDistance = distance + t * animationSpeed * 0.1;
          const ringIndex = Math.floor(animatedDistance) % 4;

          if (ringIndex < 1) continue;

          // Use seeds to determine if pixel should be drawn
          const hash = (x * seed1 + y * seed2 + ringIndex * seed3) % 100;
          const threshold = seed4;

          if (hash > threshold) {
            // Calculate color based on ring section
            let hue;
            if (ringIndex === 1) {
              // Inner rings - use slider 1 (center hue)
              hue = (centerHue + x * 5) % 360;
            } else if (ringIndex === 2) {
              // Middle rings - use slider 2 (middle hue)
              hue = (middleHue + y * 5) % 360;
            } else {
              // Outer rings - use slider 3 (outer hue)
              hue = (outerHue + (x + y) * 3) % 360;
            }

            const saturation = 70 + ((ringIndex * 10) % 20);
            const value = 80 + ((x + y) % 15);

            const color = hsvToRgb(
              hue,
              Math.min(100, saturation),
              Math.min(100, value)
            );
            ctx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;

            // Draw in all 4 quadrants for symmetry
            const startX = x * cellWidth;
            const startY = y * cellHeight;
            const mirrorX = (gridSize - 1 - x) * cellWidth;
            const mirrorY = (gridSize - 1 - y) * cellHeight;

            // Top-left
            ctx.fillRect(startX, startY, cellWidth, cellHeight);
            // Top-right
            ctx.fillRect(mirrorX, startY, cellWidth, cellHeight);
            // Bottom-left
            ctx.fillRect(startX, mirrorY, cellWidth, cellHeight);
            // Bottom-right
            ctx.fillRect(mirrorX, mirrorY, cellWidth, cellHeight);

            pixelsDrawn += 4;
          }
        }
      }

      console.log(
        `Drew ${pixelsDrawn} pixels, resolution: ${resolution}, speed: ${animationSpeed}, hues: center=${centerHue.toFixed(
          1
        )}, middle=${middleHue.toFixed(1)}, outer=${outerHue.toFixed(1)}`
      );
    }
    animationRef.current = requestAnimationFrame(animate);
  }, [serialData]);

  useEffect(() => {
    // Set canvas size to fill screen
    const resizeCanvas = () => {
      if (canvasRef.current) {
        const canvas = canvasRef.current;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
    };
  }, []);

  useEffect(() => {
    // Start animation immediately
    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [animate]);

  return (
    <AppContainer>
      <Canvas ref={canvasRef} />
    </AppContainer>
  );
}
