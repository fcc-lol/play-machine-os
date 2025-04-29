import React, { useState, useEffect, useRef } from "react";
import styled from "styled-components";
import { useSerial } from "../../functions/SerialDataContext";

const AppContainer = styled.div`
  background-color: #000000;
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
`;

const Blob = styled.div`
  position: absolute;
  width: 50px;
  height: 50px;
  background-color: #4caf50;
  border-radius: 50%;
  transform: translate(${(props) => props.x}px, ${(props) => props.y}px);
`;

const App1 = () => {
  const { serialData } = useSerial();
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);
  const timeRef = useRef(0);

  useEffect(() => {
    const speed = serialData.vertical_slider_1?.value || 0;
    const normalizedSpeed = speed / 100; // Convert 0-100 to 0-1

    const moveBlob = () => {
      if (!containerRef.current) return;

      const container = containerRef.current;
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;

      // Add margin to keep blob away from edges
      const margin = 25; // Half of blob size
      const maxX = containerWidth - 50;
      const maxY = containerHeight - 50;

      // Adjust time increment based on slider value
      timeRef.current += 0.01 * (normalizedSpeed + 2);

      setPosition({
        x:
          margin +
          (Math.sin(timeRef.current * 0.5) * (maxX - margin * 2) + maxX) / 2,
        y:
          margin +
          (Math.sin(timeRef.current * 0.3) * (maxY - margin * 2) + maxY) / 2
      });
    };

    const interval = setInterval(moveBlob, 16); // ~60fps
    return () => clearInterval(interval);
  }, [serialData.vertical_slider_1?.value]);

  return (
    <AppContainer ref={containerRef}>
      <Blob x={position.x} y={position.y} />
    </AppContainer>
  );
};

export default App1;
