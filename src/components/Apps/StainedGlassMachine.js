import styled from "styled-components";
import { useEffect, useRef } from "react";
import { Delaunay } from "d3-delaunay";
import { useSerial } from "../../functions/SerialDataContext";
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
`;

const Canvas = styled.canvas`
  width: 1024px;
  height: 600px;
  background-color: black;
  image-rendering: smooth;
`;

const StainedGlassMachine = () => {
  const { serialData } = useSerial();
  const serialDataRef = useRef(serialData);
  const canvasRef = useRef(null);
  const pointsRef = useRef([]);
  const velocitiesRef = useRef([]);
  const prevKnobValueRef = useRef(null);
  const targetPointsRef = useRef(20);

  // Keep the ref up to date
  useEffect(() => {
    serialDataRef.current = serialData;
  }, [serialData]);

  const generateRandomPoints = (count) => {
    const points = [];
    const velocities = [];
    for (let i = 0; i < count; i++) {
      points.push([Math.random() * 1024, Math.random() * 600]);
      velocities.push({
        x: (Math.random() - 0.5) * 2,
        y: (Math.random() - 0.5) * 2,
      });
    }
    return { points, velocities };
  };

  const updatePointsCount = () => {
    const currentKnobValue = serialDataRef.current.knob_2.value;
    if (currentKnobValue !== prevKnobValueRef.current) {
      const targetPoints = Math.floor(ConvertRange(currentKnobValue, 5, 100));
      targetPointsRef.current = targetPoints;
      const currentPoints = pointsRef.current.length;

      if (targetPoints > currentPoints) {
        // Add new points
        const { points: newPoints, velocities: newVelocities } =
          generateRandomPoints(targetPoints - currentPoints);
        pointsRef.current.push(...newPoints);
        velocitiesRef.current.push(...newVelocities);
      } else if (targetPoints < currentPoints) {
        // Remove excess points
        pointsRef.current = pointsRef.current.slice(0, targetPoints);
        velocitiesRef.current = velocitiesRef.current.slice(0, targetPoints);
      }

      prevKnobValueRef.current = currentKnobValue;
    }
  };

  const drawStainedGlass = (ctx, points) => {
    ctx.clearRect(0, 0, 1024, 600);
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, 1024, 600);

    const borderWidth = ConvertRange(serialDataRef.current.knob_1.value, 0, 30);
    const delaunay = Delaunay.from(points);
    const voronoi = delaunay.voronoi([0, 0, 1024, 600]);

    for (let i = 0; i < points.length; i++) {
      let cell = voronoi.cellPolygon(i);
      if (!cell) continue;

      // Get three different hue values from vertical sliders
      const hue1 = Math.floor(
        ConvertRange(serialDataRef.current.vertical_slider_1.value, 350, 0)
      );
      const hue2 = Math.floor(
        ConvertRange(serialDataRef.current.vertical_slider_2.value, 350, 0)
      );
      const hue3 = Math.floor(
        ConvertRange(serialDataRef.current.vertical_slider_3.value, 350, 0)
      );

      // Cycle through the three hues based on cell index
      const hue = [hue1, hue2, hue3][i % 3];

      // Higher saturation for stained glass effect (60% to 100%)
      const saturation = 0.6 + (i % 8) * 0.05;

      // Higher lightness for stained glass effect (40% to 60%)
      const lightness = 0.4 + (i % 4) * 0.05;

      ctx.fillStyle = `hsl(${hue}, ${saturation * 100}%, ${lightness * 100}%)`;
      ctx.beginPath();
      ctx.moveTo(cell[0][0], cell[0][1]);
      for (let j = 1; j < cell.length; j++) {
        ctx.lineTo(cell[j][0], cell[j][1]);
      }
      ctx.closePath();
      ctx.fill();

      // Draw lead lines (thicker black borders)
      ctx.save();
      ctx.strokeStyle = borderWidth > 0 ? "black" : "transparent";
      ctx.lineWidth = borderWidth;
      ctx.lineJoin = "round";
      ctx.stroke();
      ctx.restore();
    }

    // Draw outer border
    if (borderWidth > 0) {
      ctx.save();
      ctx.strokeStyle = borderWidth;
      ctx.lineWidth = borderWidth;
      ctx.lineJoin = "round";
      const half = borderWidth / 2;
      ctx.strokeRect(half, half, 1024 - borderWidth, 600 - borderWidth);
      ctx.restore();
    }
  };

  const updatePoints = (points, velocities, speed) => {
    points.forEach((point, i) => {
      point[0] += velocities[i].x * speed;
      point[1] += velocities[i].y * speed;

      // Bounce off walls
      if (point[0] < 0 || point[0] > 1024) velocities[i].x *= -1;
      if (point[1] < 0 || point[1] > 600) velocities[i].y *= -1;
    });
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d", { alpha: false });
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    // Initial points generation
    const { points, velocities } = generateRandomPoints(20);
    pointsRef.current = points;
    velocitiesRef.current = velocities;
    targetPointsRef.current = 20;

    const animate = () => {
      updatePointsCount();
      const speed = ConvertRange(
        serialDataRef.current.horizontal_slider.value,
        0.1,
        6
      );
      updatePoints(pointsRef.current, velocitiesRef.current, speed);
      drawStainedGlass(ctx, pointsRef.current);
      requestAnimationFrame(animate);
    };
    animate();
  }, []);

  return (
    <Root>
      <Canvas ref={canvasRef} width={1024} height={600} />
    </Root>
  );
};

export default StainedGlassMachine;
