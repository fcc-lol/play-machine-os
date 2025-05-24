import React, { useEffect, useRef } from "react";
import styled from "styled-components";
import { useSerial } from "../../functions/SerialDataContext";
import ConvertRange from "../../functions/ConvertRange";

const Canvas = styled.canvas`
  background-color: #000000;
  width: calc(100% + 20rem);
  height: 100%;
  margin-left: -10rem;
`;

// Helper function to convert RGB to HSL
const rgbToHsl = (r, g, b) => {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h,
    s,
    l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
      default:
        h = 0;
        break;
    }
    h /= 6;
  }
  return [h * 360, s * 100, l * 100];
};

// Helper function to convert HSL to RGB
const hslToRgb = (h, s, l) => {
  h /= 360;
  s /= 100;
  l /= 100;
  let r, g, b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
};

export default function WaveVisualizer() {
  const canvasRef = useRef(null);
  const { serialData } = useSerial();
  const animationRef = useRef(null);
  const paramsRef = useRef({
    wavelength: 0.02,
    amplitude: 50,
    speed: 0.05,
    phaseOffsetSpeed: 0,
    targetPhaseOffsetSpeed: 0,
    time: 0,
    blur: 0,
    strokeWidth: 4,
    numWaves: 1,
    color: { r: 255, g: 255, b: 255 }
  });

  // Update parameters when serial data changes
  useEffect(() => {
    if (serialData.horizontal_slider) {
      paramsRef.current.wavelength = ConvertRange(
        serialData.horizontal_slider.value,
        0.1,
        0.001
      );
    }
    if (serialData.knob_1) {
      paramsRef.current.amplitude = ConvertRange(
        serialData.knob_1.value,
        10,
        150
      );
    }
    if (serialData.knob_2) {
      paramsRef.current.speed = ConvertRange(
        serialData.knob_2.value,
        0.05,
        0.2
      );
    }
    if (serialData.knob_3) {
      paramsRef.current.blur = ConvertRange(serialData.knob_3.value, 0, 100);
    }
    if (serialData.knob_4) {
      paramsRef.current.strokeWidth = ConvertRange(
        serialData.knob_4.value,
        4,
        400
      );
    }
    if (serialData.knob_5) {
      // Convert to range 0-8, multiply by 2 and add 1 to get odd numbers 1-17
      const rawValue = Math.max(0, ConvertRange(serialData.knob_5.value, 0, 8));
      paramsRef.current.numWaves = Math.max(1, Math.round(rawValue) * 2 + 1);
    }
    if (serialData.vertical_slider_1) {
      paramsRef.current.color.r = ConvertRange(
        serialData.vertical_slider_1.value,
        0,
        255
      );
    }
    if (serialData.vertical_slider_2) {
      paramsRef.current.color.g = ConvertRange(
        serialData.vertical_slider_2.value,
        0,
        255
      );
    }
    if (serialData.vertical_slider_3) {
      paramsRef.current.color.b = ConvertRange(
        serialData.vertical_slider_3.value,
        0,
        255
      );
    }
  }, [serialData]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let lastFrameTime = performance.now();

    const drawSineWave = (timestamp) => {
      const deltaTime = timestamp - lastFrameTime;
      lastFrameTime = timestamp;

      // Clear the canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Apply blur filter
      ctx.filter = `blur(${paramsRef.current.blur}px)`;

      // Smoothly interpolate phase offset speed
      const smoothingFactor = 0.1;
      paramsRef.current.phaseOffsetSpeed +=
        (paramsRef.current.targetPhaseOffsetSpeed -
          paramsRef.current.phaseOffsetSpeed) *
        smoothingFactor;

      const { wavelength, amplitude, speed, time, numWaves, color } =
        paramsRef.current;
      // When there's only one wave, center it vertically
      const waveSpacing =
        numWaves === 1 ? canvas.height / 2 : canvas.height / (numWaves + 1);

      // Convert base color to HSL
      const [baseH, baseS, baseL] = rgbToHsl(color.r, color.g, color.b);

      // Draw multiple waves
      for (let wave = 0; wave < numWaves; wave++) {
        ctx.beginPath();
        // For single wave, use center position, otherwise space them out
        const yOffset =
          numWaves === 1 ? canvas.height / 2 : waveSpacing * (wave + 1);

        // For single wave, use full speed, otherwise calculate based on distance from center
        const speedFactor =
          numWaves === 1
            ? 1
            : 1 -
              (Math.abs(wave - (numWaves - 1) / 2) / ((numWaves - 1) / 2)) *
                0.8;
        const wavePhase = time * speedFactor;

        // Calculate color offset for this wave with a smaller range
        const hueOffset = (wave * (60 / numWaves)) % 60;
        const [r, g, b] = hslToRgb((baseH + hueOffset) % 360, baseS, baseL);
        ctx.strokeStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.lineWidth = paramsRef.current.strokeWidth;

        for (let x = 0; x < canvas.width; x++) {
          const y = yOffset + Math.sin(x * wavelength + wavePhase) * amplitude;
          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }

        ctx.stroke();
      }

      // Reset filter
      ctx.filter = "none";

      // Update time for animation
      paramsRef.current.time += speed * (deltaTime / 16.67);

      // Request next frame
      animationRef.current = requestAnimationFrame(drawSineWave);
    };

    // Set canvas size
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Start animation
    animationRef.current = requestAnimationFrame(drawSineWave);

    // Cleanup
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []); // Empty dependency array since we're using refs

  return <Canvas ref={canvasRef} />;
}
