import styled, { createGlobalStyle } from "styled-components";
import { useEffect, useRef, useState } from "react";
import { Delaunay } from "d3-delaunay";
import hardware from "../../config/Hardware.json";
import { useSerial } from "../../functions/SerialDataContext";
import ConvertRange from "../../functions/ConvertRange";
import ClipperLib from "clipper-lib";

const GlobalStyle = createGlobalStyle`
  html, body {
    width: 100vw;
    height: 100vh;
    margin: 0;
    padding: 0;
    overflow: hidden;
    box-sizing: border-box;
  }
`;

const Root = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: black;
  color: ${(props) => props.theme.text};
  font-family: ${(props) => props.theme.fontFamily};
  font-size: 1.25rem;
  overflow: hidden;
  margin: 0;
  padding: 0;
  box-sizing: border-box;

  pre {
    margin: 0;
    padding: 0;
  }

  * {
    box-sizing: border-box;
  }
`;

const Canvas = styled.canvas`
  position: absolute;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: black;
  image-rendering: smooth;
  z-index: 1;
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  display: block;
`;

const BlurCanvas = styled.canvas`
  position: absolute;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: transparent;
  image-rendering: smooth;
  opacity: ${(props) => (props.isVisible ? 1 : 0)};
  transition: opacity 0.3s ease;
  z-index: 2;
  pointer-events: none;
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  display: block;
`;

const CanvasContainer = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  margin: 0;
  padding: 0;
  box-sizing: border-box;
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
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // Keep the ref up to date
  useEffect(() => {
    serialDataRef.current = serialData;
  }, [serialData]);

  // Handle window resize
  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  // Handle button presses
  useEffect(() => {
    // Add safety checks for serialData properties
    if (
      !serialData ||
      !serialData.button_a ||
      !serialData.button_up ||
      !serialData.button_down
    ) {
      return;
    }

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
  }, [serialData]);

  const generateRandomPoints = (count, canvasWidth, canvasHeight) => {
    const points = [];
    const velocities = [];
    for (let i = 0; i < count; i++) {
      points.push([Math.random() * canvasWidth, Math.random() * canvasHeight]);
      velocities.push({
        x: (Math.random() - 0.5) * 2,
        y: (Math.random() - 0.5) * 2,
      });
    }
    return { points, velocities };
  };

  const drawVoronoi = (ctx, points) => {
    const canvasWidth = ctx.canvas.width;
    const canvasHeight = ctx.canvas.height;

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    const delaunay = Delaunay.from(points);
    const voronoi = delaunay.voronoi([0, 0, canvasWidth, canvasHeight]);

    for (let i = 0; i < points.length; i++) {
      let cell = voronoi.cellPolygon(i);
      if (!cell) continue;

      // Add safety checks for serialDataRef.current and its properties
      if (
        !serialDataRef.current ||
        !serialDataRef.current.knob_1 ||
        !serialDataRef.current.knob_4 ||
        !serialDataRef.current.knob_5 ||
        !serialDataRef.current.knob_3 ||
        !serialDataRef.current.vertical_slider_1 ||
        !serialDataRef.current.vertical_slider_2 ||
        !serialDataRef.current.vertical_slider_3
      ) {
        // Use default values if serialData is not available
        ctx.fillStyle = "hsl(180, 50%, 50%)";
        ctx.beginPath();
        for (let j = 0; j < cell.length; j++) {
          const pt = cell[j];
          if (j === 0) ctx.moveTo(pt[0], pt[1]);
          else ctx.lineTo(pt[0], pt[1]);
        }
        ctx.closePath();
        ctx.fill();
        continue;
      }

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
            Y: Math.round(pt[1] * scale),
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
          Y: Math.round(pt[1] * scale),
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

  const updatePoints = (
    points,
    velocities,
    speed,
    canvasWidth,
    canvasHeight
  ) => {
    points.forEach((point, i) => {
      point[0] += velocities[i].x * speed;
      point[1] += velocities[i].y * speed;

      // Bounce off walls
      if (point[0] < 0 || point[0] > canvasWidth) velocities[i].x *= -1;
      if (point[1] < 0 || point[1] > canvasHeight) velocities[i].y *= -1;
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

    // Set canvas dimensions to match display size
    const updateCanvasSize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
      blurCanvas.width = width;
      blurCanvas.height = height;
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";
      blurCanvas.style.width = width + "px";
      blurCanvas.style.height = height + "px";

      // Regenerate points for new canvas size
      const { points: newPoints, velocities: newVelocities } =
        generateRandomPoints(targetPointsRef.current, width, height);
      pointsRef.current = newPoints;
      velocitiesRef.current = newVelocities;
    };

    // Call once at start
    updateCanvasSize();
    window.addEventListener("resize", updateCanvasSize);

    const updatePointsCount = () => {
      // Add safety check for knob_2
      if (!serialDataRef.current || !serialDataRef.current.knob_2) {
        return;
      }

      const currentKnobValue = serialDataRef.current.knob_2.value;
      if (currentKnobValue !== prevKnobValueRef.current) {
        const targetPoints = Math.floor(ConvertRange(currentKnobValue, 5, 100));
        targetPointsRef.current = targetPoints;
        const currentPoints = pointsRef.current.length;
        const width = canvas.width;
        const height = canvas.height;

        if (targetPoints > currentPoints) {
          // Add new points
          const { points: newPoints, velocities: newVelocities } =
            generateRandomPoints(targetPoints - currentPoints, width, height);
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

      // Add safety check for horizontal_slider
      const speed =
        serialDataRef.current && serialDataRef.current.horizontal_slider
          ? ConvertRange(serialDataRef.current.horizontal_slider.value, 0, 6)
          : 0;

      updatePoints(
        pointsRef.current,
        velocitiesRef.current,
        speed,
        canvas.width,
        canvas.height
      );
      drawVoronoi(ctx, pointsRef.current);

      // Update blur canvas if enabled
      if (isBlurredRef.current) {
        blurCtx.clearRect(0, 0, canvas.width, canvas.height);
        blurCtx.filter = `blur(${blurAmountRef.current}px)`;
        blurCtx.drawImage(canvas, 0, 0);
        blurCtx.filter = "none";

        blurCtx.save();
        blurCtx.globalCompositeOperation = "color-dodge";
        blurCtx.fillStyle = "#cccbcb";
        blurCtx.fillRect(0, 0, canvas.width, canvas.height);
        blurCtx.restore();

        blurCtx.save();
        blurCtx.globalCompositeOperation = "color-burn";
        blurCtx.fillStyle = "#000";
        blurCtx.fillRect(0, 0, canvas.width, canvas.height);
        blurCtx.restore();
      }

      requestAnimationFrame(animate);
    };
    animate();

    // Cleanup function
    return () => {
      window.removeEventListener("resize", updateCanvasSize);
    };
  }, [dimensions]);

  return (
    <>
      <GlobalStyle />
      <Root>
        <CanvasContainer>
          <Canvas ref={canvasRef} />
          <BlurCanvas ref={blurCanvasRef} isVisible={isBlurredRef.current} />
        </CanvasContainer>
      </Root>
    </>
  );
}
