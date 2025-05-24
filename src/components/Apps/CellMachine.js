import styled from "styled-components";
import { useEffect, useRef } from "react";
import { Delaunay } from "d3-delaunay";
import hardware from "../../config/Hardware.json";
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
  width: ${hardware.screen.width}px;
  height: ${hardware.screen.height}px;
  background-color: black;
  image-rendering: smooth;
  position: relative;
  z-index: 1;
`;

const BlurCanvas = styled.canvas`
  position: absolute;
  top: 0;
  left: 0;
  width: ${hardware.screen.width}px;
  height: ${hardware.screen.height}px;
  background-color: transparent;
  image-rendering: smooth;
  opacity: ${(props) => (props.isVisible ? 1 : 0)};
  transition: opacity 0.3s ease;
  z-index: 2;
  pointer-events: none;
`;

const CanvasContainer = styled.div`
  position: relative;
  width: ${hardware.screen.width}px;
  height: ${hardware.screen.height}px;
`;

export default function CellMachine() {
  const { serialData } = useSerial();
  const serialDataRef = useRef(serialData);
  const canvasRef = useRef(null);
  const blurCanvasRef = useRef(null);
  const isBlurredRef = useRef(false);
  const prevButtonStateRef = useRef(false);
  const blurAmountRef = useRef(16); // Start at max blur
  const pointsRef = useRef([]);
  const velocitiesRef = useRef([]);
  const prevKnobValueRef = useRef(null);
  const targetPointsRef = useRef(20);

  // Keep the ref up to date
  useEffect(() => {
    serialDataRef.current = serialData;
  }, [serialData]);

  // Handle button presses
  useEffect(() => {
    const currentButtonState = serialData.button_a.value;

    // Toggle blur on/off with button_a
    // if (currentButtonState && !prevButtonStateRef.current) {
    //   isBlurredRef.current = !isBlurredRef.current;
    // }

    // Adjust blur amount with up/down buttons
    if (serialData.button_up.value && !prevButtonStateRef.current) {
      blurAmountRef.current = Math.min(16, blurAmountRef.current + 2);
    }
    if (serialData.button_down.value && !prevButtonStateRef.current) {
      blurAmountRef.current = Math.max(2, blurAmountRef.current - 2);
    }

    // Update previous button state
    prevButtonStateRef.current = currentButtonState;
  }, [
    serialData.button_a.value,
    serialData.button_up.value,
    serialData.button_down.value
  ]);

  const generateRandomPoints = (count) => {
    const points = [];
    const velocities = [];
    for (let i = 0; i < count; i++) {
      points.push([
        Math.random() * hardware.screen.width,
        Math.random() * hardware.screen.height
      ]);
      velocities.push({
        x: (Math.random() - 0.5) * 2,
        y: (Math.random() - 0.5) * 2
      });
    }
    return { points, velocities };
  };

  const drawVoronoi = (ctx, points) => {
    ctx.clearRect(0, 0, hardware.screen.width, hardware.screen.height);
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, hardware.screen.width, hardware.screen.height);

    const delaunay = Delaunay.from(points);
    const voronoi = delaunay.voronoi([
      0,
      0,
      hardware.screen.width,
      hardware.screen.height
    ]);

    for (let i = 0; i < points.length; i++) {
      let cell = voronoi.cellPolygon(i);
      if (!cell) continue;

      // Use knob1 to control stroke width (0 at 0% to 20 at 100%)
      const strokeWidth = ConvertRange(
        serialDataRef.current.knob_1.value,
        0,
        20
      );

      // Use knob4 to control center fill amount (0 at 0% to 0.8 at 100%)
      const centerFillAmount = ConvertRange(
        serialDataRef.current.knob_4.value,
        0,
        0.8
      );

      // Use knob5 to control inset shape roundness (0 at 0% to 48 at 100%)
      const insetRadius = ConvertRange(
        serialDataRef.current.knob_5.value,
        0,
        48
      );

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

      const maxRadius = ConvertRange(serialDataRef.current.knob_3.value, 0, 48); // fillet radius 0-100px

      // If roundness is zero, draw sharp-cornered polygon
      if (maxRadius < 0.1) {
        // Draw the main cell with stroke
        ctx.beginPath();
        for (let j = 0; j < cell.length; j++) {
          const pt = cell[j];
          if (j === 0) ctx.moveTo(pt[0], pt[1]);
          else ctx.lineTo(pt[0], pt[1]);
        }
        ctx.closePath();
        ctx.fill();
        if (strokeWidth > 0) {
          ctx.strokeStyle = "black";
          ctx.lineWidth = strokeWidth;
          ctx.stroke();
        }

        // Draw the center fill
        if (centerFillAmount > 0) {
          const scale = 100;
          const clipperPath = cell.map((pt) => ({
            X: Math.round(pt[0] * scale),
            Y: Math.round(pt[1] * scale)
          }));

          // If inset roundness is zero, draw sharp-cornered inset
          if (insetRadius < 0.1) {
            const co = new ClipperLib.ClipperOffset(2, 0.25 * scale);
            co.AddPath(
              clipperPath,
              ClipperLib.JoinType.jtRound,
              ClipperLib.EndType.etClosedPolygon
            );

            let insetPath = [];
            co.Execute(insetPath, -centerFillAmount * 100 * scale);

            if (insetPath.length > 0) {
              ctx.fillStyle = "black";
              ctx.beginPath();
              for (let j = 0; j < insetPath[0].length; j++) {
                const pt = insetPath[0][j];
                const x = pt.X / scale;
                const y = pt.Y / scale;
                if (j === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
              }
              ctx.closePath();
              ctx.fill();
            }
          } else {
            // --- Clipper.js robust rounding with adaptive fallback for inset ---
            const minRadius = 1; // px
            let tryRadius = insetRadius;
            let roundedInsetPath = null;
            while (tryRadius >= minRadius && !roundedInsetPath) {
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
                  roundedInsetPath = offsetOut[0];
                  break;
                }
              }
              tryRadius /= 2;
            }

            if (roundedInsetPath) {
              const co = new ClipperLib.ClipperOffset(2, 0.25 * scale);
              co.AddPath(
                roundedInsetPath,
                ClipperLib.JoinType.jtRound,
                ClipperLib.EndType.etClosedPolygon
              );

              let insetPath = [];
              co.Execute(insetPath, -centerFillAmount * 100 * scale);

              if (insetPath.length > 0) {
                ctx.fillStyle = "black";
                ctx.beginPath();
                for (let j = 0; j < insetPath[0].length; j++) {
                  const pt = insetPath[0][j];
                  const x = pt.X / scale;
                  const y = pt.Y / scale;
                  if (j === 0) ctx.moveTo(x, y);
                  else ctx.lineTo(x, y);
                }
                ctx.closePath();
                ctx.fill();
              }
            }
          }
        }
        continue;
      }

      // --- Clipper.js robust rounding with adaptive fallback ---
      const scale = 100;
      const minRadius = 1; // px
      let tryRadius = maxRadius;
      let roundedPath = null;
      while (tryRadius >= minRadius && !roundedPath) {
        const clipperPath = cell.map((pt) => ({
          X: Math.round(pt[0] * scale),
          Y: Math.round(pt[1] * scale)
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
        const centroid = cell.reduce(
          (acc, pt) => ({ x: acc.x + pt[0], y: acc.y + pt[1] }),
          { x: 0, y: 0 }
        );
        centroid.x /= cell.length;
        centroid.y /= cell.length;
        // Find min distance from centroid to any vertex
        let minDist = Infinity;
        for (let pt of cell) {
          const d = Math.hypot(pt[0] - centroid.x, pt[1] - centroid.y);
          if (d < minDist) minDist = d;
        }
        if (minDist > 0.1) {
          ctx.beginPath();
          ctx.arc(centroid.x, centroid.y, minDist, 0, 2 * Math.PI);
          ctx.closePath();
          ctx.fill();
          if (strokeWidth > 0) {
            ctx.strokeStyle = "black";
            ctx.lineWidth = strokeWidth;
            ctx.stroke();
          }
        }
        continue;
      }

      // Draw the rounded polygon with stroke
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
      if (strokeWidth > 0) {
        ctx.strokeStyle = "black";
        ctx.lineWidth = strokeWidth;
        ctx.stroke();
      }

      // Draw the center fill for rounded polygons
      if (centerFillAmount > 0) {
        // If inset roundness is zero, draw sharp-cornered inset
        if (insetRadius < 0.1) {
          const co = new ClipperLib.ClipperOffset(2, 0.25 * scale);
          co.AddPath(
            roundedPath,
            ClipperLib.JoinType.jtRound,
            ClipperLib.EndType.etClosedPolygon
          );

          let insetPath = [];
          co.Execute(insetPath, -centerFillAmount * 100 * scale);

          if (insetPath.length > 0) {
            ctx.fillStyle = "black";
            ctx.beginPath();
            for (let j = 0; j < insetPath[0].length; j++) {
              const pt = insetPath[0][j];
              const x = pt.X / scale;
              const y = pt.Y / scale;
              if (j === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.fill();
          }
        } else {
          // --- Clipper.js robust rounding with adaptive fallback for inset ---
          const minRadius = 1; // px
          let tryRadius = insetRadius;
          let roundedInsetPath = null;
          while (tryRadius >= minRadius && !roundedInsetPath) {
            const co = new ClipperLib.ClipperOffset(2, 0.25 * scale);
            co.AddPath(
              roundedPath,
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
                roundedInsetPath = offsetOut[0];
                break;
              }
            }
            tryRadius /= 2;
          }

          if (roundedInsetPath) {
            const co = new ClipperLib.ClipperOffset(2, 0.25 * scale);
            co.AddPath(
              roundedInsetPath,
              ClipperLib.JoinType.jtRound,
              ClipperLib.EndType.etClosedPolygon
            );

            let insetPath = [];
            co.Execute(insetPath, -centerFillAmount * 100 * scale);

            if (insetPath.length > 0) {
              ctx.fillStyle = "black";
              ctx.beginPath();
              for (let j = 0; j < insetPath[0].length; j++) {
                const pt = insetPath[0][j];
                const x = pt.X / scale;
                const y = pt.Y / scale;
                if (j === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
              }
              ctx.closePath();
              ctx.fill();
            }
          }
        }
      }
    }
  };

  const updatePoints = (points, velocities, speed) => {
    points.forEach((point, i) => {
      point[0] += velocities[i].x * speed;
      point[1] += velocities[i].y * speed;

      // Bounce off walls
      if (point[0] < 0 || point[0] > hardware.screen.width)
        velocities[i].x *= -1;
      if (point[1] < 0 || point[1] > hardware.screen.height)
        velocities[i].y *= -1;
    });
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const blurCanvas = blurCanvasRef.current;
    const ctx = canvas.getContext("2d", { alpha: false });
    const blurCtx = blurCanvas.getContext("2d", { alpha: false });
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    blurCtx.imageSmoothingEnabled = true;
    blurCtx.imageSmoothingQuality = "high";

    // Initial points generation
    const { points, velocities } = generateRandomPoints(20);
    pointsRef.current = points;
    velocitiesRef.current = velocities;
    targetPointsRef.current = 20;

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

    const animate = () => {
      updatePointsCount();
      const speed = ConvertRange(
        serialDataRef.current.horizontal_slider.value,
        0,
        6
      );
      updatePoints(pointsRef.current, velocitiesRef.current, speed);
      drawVoronoi(ctx, pointsRef.current);

      // Update blur canvas if enabled
      if (isBlurredRef.current) {
        // Update blur canvas
        blurCtx.clearRect(0, 0, hardware.screen.width, hardware.screen.height);
        blurCtx.filter = `blur(${blurAmountRef.current}px)`;
        blurCtx.drawImage(canvas, 0, 0);
        blurCtx.filter = "none";

        // Apply color dodge
        blurCtx.save();
        blurCtx.globalCompositeOperation = "color-dodge";
        blurCtx.fillStyle = "#cccbcb";
        blurCtx.fillRect(0, 0, hardware.screen.width, hardware.screen.height);
        blurCtx.restore();

        // Apply color burn
        blurCtx.save();
        blurCtx.globalCompositeOperation = "color-burn";
        blurCtx.fillStyle = "#000";
        blurCtx.fillRect(0, 0, hardware.screen.width, hardware.screen.height);
        blurCtx.restore();
      }

      requestAnimationFrame(animate);
    };
    animate();
  }, []);

  return (
    <Root>
      <CanvasContainer>
        <Canvas
          ref={canvasRef}
          width={hardware.screen.width}
          height={hardware.screen.height}
        />
        <BlurCanvas
          ref={blurCanvasRef}
          width={hardware.screen.width}
          height={hardware.screen.height}
          isVisible={isBlurredRef.current}
        />
      </CanvasContainer>
    </Root>
  );
}
