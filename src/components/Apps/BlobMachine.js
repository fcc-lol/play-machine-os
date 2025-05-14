import styled from "styled-components";
import { useEffect, useRef } from "react";
import { Delaunay } from "d3-delaunay";
import { useSerial } from "../../functions/SerialDataContext";
import ConvertRange from "../../functions/ConvertRange";
import ClipperLib from "clipper-lib";

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

const BlobMachine = () => {
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

  const drawVoronoi = (ctx, points) => {
    ctx.clearRect(0, 0, 1024, 600);
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, 1024, 600);

    // Use knob1 to control inset scale (0.99 at 0% to 0.75 at 100%)
    const insetScale = ConvertRange(
      serialDataRef.current.knob_1.value,
      1,
      0.75
    );

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

      // Vary saturation for adjacent cells (30% to 100%)
      const saturation = 0.2 + (i % 12) * 0.07;

      ctx.fillStyle = `hsl(${hue}, ${saturation * 100}%, 50%)`;

      // Calculate center point of the cell
      const centerX = cell.reduce((sum, p) => sum + p[0], 0) / cell.length;
      const centerY = cell.reduce((sum, p) => sum + p[1], 0) / cell.length;

      // Pre-calculate all scaled points
      const scaledPoints = cell.map((point) => ({
        x: centerX + (point[0] - centerX) * insetScale,
        y: centerY + (point[1] - centerY) * insetScale,
      }));

      const maxRadius = ConvertRange(serialDataRef.current.knob_3.value, 0, 48); // fillet radius 0-100px

      // If roundness is zero, draw sharp-cornered polygon
      if (maxRadius < 0.1) {
        ctx.beginPath();
        for (let j = 0; j < scaledPoints.length; j++) {
          const pt = scaledPoints[j];
          if (j === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        }
        ctx.closePath();
        ctx.fill();
        continue;
      }

      // --- Clipper.js robust rounding with adaptive fallback ---
      const scale = 100;
      const minRadius = 1; // px
      let tryRadius = maxRadius;
      let roundedPath = null;
      while (tryRadius >= minRadius && !roundedPath) {
        const clipperPath = scaledPoints.map((pt) => ({
          X: Math.round(pt.x * scale),
          Y: Math.round(pt.y * scale),
        }));
        const co = new ClipperLib.ClipperOffset(2, 0.25 * scale);
        co.AddPath(
          clipperPath,
          ClipperLib.JoinType.jtRound,
          ClipperLib.EndType.etClosedPolygon
        );
        let offsetIn = [];
        co.Execute(offsetIn, -tryRadius * scale);
        if (offsetIn.length > 0) {
          const co2 = new ClipperLib.ClipperOffset(2, 0.25 * scale);
          co2.AddPath(
            offsetIn[0],
            ClipperLib.JoinType.jtRound,
            ClipperLib.EndType.etClosedPolygon
          );
          let offsetOut = [];
          co2.Execute(offsetOut, tryRadius * scale);
          if (offsetOut.length > 0) {
            roundedPath = offsetOut[0];
            break;
          }
        }
        tryRadius /= 2;
      }
      // If offset failed, draw a fallback circle at the centroid
      if (!roundedPath) {
        // Compute centroid
        const centroid = scaledPoints.reduce(
          (acc, pt) => ({ x: acc.x + pt.x, y: acc.y + pt.y }),
          { x: 0, y: 0 }
        );
        centroid.x /= scaledPoints.length;
        centroid.y /= scaledPoints.length;
        // Find min distance from centroid to any vertex
        let minDist = Infinity;
        for (let pt of scaledPoints) {
          const d = Math.hypot(pt.x - centroid.x, pt.y - centroid.y);
          if (d < minDist) minDist = d;
        }
        if (minDist > 0.1) {
          ctx.beginPath();
          ctx.arc(centroid.x, centroid.y, minDist, 0, 2 * Math.PI);
          ctx.closePath();
          ctx.fill();
        }
        continue;
      }
      // Draw the rounded polygon
      ctx.beginPath();
      for (let j = 0; j < roundedPath.length; j++) {
        const pt = roundedPath[j];
        const x = pt.X / scale;
        const y = pt.Y / scale;
        if (j === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.closePath();
      ctx.fill();
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
        0,
        6
      );
      updatePoints(pointsRef.current, velocitiesRef.current, speed);
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
