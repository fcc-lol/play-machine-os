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

// Chaikin's corner-cutting algorithm for polygon smoothing
function chaikinSmooth(points, iterations = 1) {
  let pts = points;
  for (let iter = 0; iter < iterations; iter++) {
    const newPts = [];
    for (let i = 0; i < pts.length; i++) {
      const p0 = pts[i];
      const p1 = pts[(i + 1) % pts.length];
      const Q = [0.75 * p0[0] + 0.25 * p1[0], 0.75 * p0[1] + 0.25 * p1[1]];
      const R = [0.25 * p0[0] + 0.75 * p1[0], 0.25 * p0[1] + 0.75 * p1[1]];
      newPts.push(Q, R);
    }
    pts = newPts;
  }
  return pts;
}

const BlobMachine = () => {
  const { serialData } = useSerial();
  const serialDataRef = useRef(serialData);
  const canvasRef = useRef(null);
  const pointsRef = useRef([]);
  const velocitiesRef = useRef([]);

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

  const drawVoronoi = (ctx, points) => {
    ctx.clearRect(0, 0, 1024, 600);
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, 1024, 600);

    // Use the latest knob value from the ref
    const borderWidth = ConvertRange(serialDataRef.current.knob_1.value, 0, 30);

    // Create Delaunay and Voronoi
    const delaunay = Delaunay.from(points);
    const voronoi = delaunay.voronoi([0, 0, 1024, 600]);

    // Draw each cell
    for (let i = 0; i < points.length; i++) {
      let cell = voronoi.cellPolygon(i);
      if (!cell) continue;
      // Smooth the cell polygon for rounded corners
      cell = chaikinSmooth(cell, 5); // 1 pass for subtle rounding
      const hue = (i * 360) / points.length;
      ctx.fillStyle = `hsl(${hue}, 70%, 50%)`;
      ctx.beginPath();
      ctx.moveTo(cell[0][0], cell[0][1]);
      for (let j = 1; j < cell.length; j++) {
        ctx.lineTo(cell[j][0], cell[j][1]);
      }
      ctx.closePath();
      ctx.fill();
      // Draw internal border
      ctx.save();
      ctx.strokeStyle = borderWidth > 0 ? "black" : "transparent";
      ctx.lineWidth = borderWidth;
      ctx.lineJoin = "round";
      ctx.stroke();
      ctx.restore();
    }

    // Draw inset border around the whole canvas
    if (borderWidth > 0) {
      ctx.save();
      ctx.strokeStyle = "black";
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

    // Enable anti-aliasing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    // Initialize points
    const { points, velocities } = generateRandomPoints(20);
    pointsRef.current = points;
    velocitiesRef.current = velocities;

    const animate = () => {
      // Use the latest slider value for speed
      const speed = ConvertRange(
        serialDataRef.current.horizontal_slider.value,
        0.1,
        4
      );
      // Update points
      updatePoints(pointsRef.current, velocitiesRef.current, speed);

      // Draw Voronoi
      drawVoronoi(ctx, pointsRef.current);

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

export default BlobMachine;
