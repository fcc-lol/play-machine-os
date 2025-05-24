import styled from "styled-components";
import { useEffect, useRef, useState } from "react";
import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: ${(props) => props.theme.menuText};
  width: 100%;
  height: 100%;
  position: relative;
`;

const Video = styled.video`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const DarkOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.7);
  pointer-events: none;
  z-index: 1;
`;

const Canvas = styled.canvas`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 2;
`;

const DebugPanel = styled.div`
  position: absolute;
  top: 10px;
  right: 10px;
  background-color: rgba(0, 0, 0, 0.7);
  color: #00ff00;
  padding: 10px;
  border-radius: 5px;
  font-family: monospace;
  max-height: 80vh;
  overflow-y: auto;
  z-index: 1000;
`;

const PointInfo = styled.div`
  margin: 5px 0;
  font-size: 12px;
`;

const MeasurementInfo = styled(PointInfo)`
  color: #ffd700;
  font-weight: bold;
  border-top: 1px solid #00ff00;
  margin-top: 10px;
  padding-top: 10px;
`;

// Hand landmark names
const HAND_LANDMARK_NAMES = {
  0: "WRIST",
  1: "THUMB_CMC",
  2: "THUMB_MCP",
  3: "THUMB_IP",
  4: "THUMB_TIP",
  5: "INDEX_FINGER_MCP",
  6: "INDEX_FINGER_PIP",
  7: "INDEX_FINGER_DIP",
  8: "INDEX_FINGER_TIP",
  9: "MIDDLE_FINGER_MCP",
  10: "MIDDLE_FINGER_PIP",
  11: "MIDDLE_FINGER_DIP",
  12: "MIDDLE_FINGER_TIP",
  13: "RING_FINGER_MCP",
  14: "RING_FINGER_PIP",
  15: "RING_FINGER_DIP",
  16: "RING_FINGER_TIP",
  17: "PINKY_MCP",
  18: "PINKY_PIP",
  19: "PINKY_DIP",
  20: "PINKY_TIP"
};

// Smoothing utility
const createSmoothingFilter = (windowSize = 5) => {
  const points = new Array(windowSize).fill(null);
  let currentIndex = 0;

  return {
    addPoint: (x, y) => {
      points[currentIndex] = { x, y };
      currentIndex = (currentIndex + 1) % windowSize;

      // Calculate average of all non-null points
      const validPoints = points.filter((p) => p !== null);
      if (validPoints.length === 0) return { x, y };

      const sum = validPoints.reduce(
        (acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }),
        { x: 0, y: 0 }
      );

      return {
        x: Math.round(sum.x / validPoints.length),
        y: Math.round(sum.y / validPoints.length)
      };
    }
  };
};

// Utility function to calculate distance between two points
const calculateDistance = (point1, point2) => {
  const dx = point2.x - point1.x;
  const dy = point2.y - point1.y;
  return Math.round(Math.sqrt(dx * dx + dy * dy));
};

export default function CameraHandDetection() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const handLandmarkerRef = useRef(null);
  const [debugPoints, setDebugPoints] = useState([]);
  const [measurements, setMeasurements] = useState({});
  const smoothingFiltersRef = useRef({});

  useEffect(() => {
    let animationFrameId;
    let videoStream;

    const initializeCamera = async () => {
      try {
        videoStream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720 }
        });
        if (videoRef.current) {
          videoRef.current.srcObject = videoStream;
        }
      } catch (error) {
        console.error("Error accessing webcam:", error);
      }
    };

    const initializeHandDetection = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );

        handLandmarkerRef.current = await HandLandmarker.createFromOptions(
          vision,
          {
            baseOptions: {
              modelAssetPath:
                "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task"
            },
            numHands: 2
          }
        );
      } catch (error) {
        console.error("Error initializing hand detection:", error);
      }
    };

    const detectHands = async () => {
      if (!videoRef.current || !canvasRef.current || !handLandmarkerRef.current)
        return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Clear previous drawings
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Detect hands
      const results = handLandmarkerRef.current.detect(video);

      // Update debug points with smoothing
      const points = [];
      const newMeasurements = {};

      if (results.landmarks) {
        results.landmarks.forEach((landmarks, handIndex) => {
          const smoothedPoints = {};

          landmarks.forEach((landmark, pointIndex) => {
            const key = `hand${handIndex}_point${pointIndex}`;

            // Initialize smoothing filter for this point if it doesn't exist
            if (!smoothingFiltersRef.current[key]) {
              smoothingFiltersRef.current[key] = createSmoothingFilter(5);
            }

            // Get smoothed coordinates
            const smoothed = smoothingFiltersRef.current[key].addPoint(
              Math.round(landmark.x * canvas.width),
              Math.round(landmark.y * canvas.height)
            );

            smoothedPoints[pointIndex] = smoothed;

            points.push({
              hand: handIndex + 1,
              point: pointIndex,
              x: smoothed.x,
              y: smoothed.y
            });
          });

          // Calculate measurements for this hand
          if (smoothedPoints[4] && smoothedPoints[8]) {
            // Thumb tip and Index tip
            const distance = calculateDistance(
              smoothedPoints[4],
              smoothedPoints[8]
            );
            newMeasurements[`hand${handIndex + 1}_pinch`] = distance;

            // Draw measurement line
            ctx.beginPath();
            ctx.moveTo(smoothedPoints[4].x, smoothedPoints[4].y);
            ctx.lineTo(smoothedPoints[8].x, smoothedPoints[8].y);
            ctx.strokeStyle = "#FFD700";
            ctx.lineWidth = 2;
            ctx.stroke();

            // Draw measurement text
            ctx.fillStyle = "#FFD700";
            ctx.font = "16px Arial";
            const midX = (smoothedPoints[4].x + smoothedPoints[8].x) / 2;
            const midY = (smoothedPoints[4].y + smoothedPoints[8].y) / 2;
            ctx.fillText(`${distance}px`, midX, midY);
          }
        });
      }

      setDebugPoints(points);
      setMeasurements(newMeasurements);

      // Draw hand landmarks using smoothed coordinates
      if (results.landmarks) {
        for (const landmarks of results.landmarks) {
          ctx.fillStyle = "#00FF00";
          for (const landmark of landmarks) {
            const key = `hand${results.landmarks.indexOf(
              landmarks
            )}_point${landmarks.indexOf(landmark)}`;
            const smoothed = smoothingFiltersRef.current[key]?.addPoint(
              Math.round(landmark.x * canvas.width),
              Math.round(landmark.y * canvas.height)
            ) || {
              x: landmark.x * canvas.width,
              y: landmark.y * canvas.height
            };

            ctx.beginPath();
            ctx.arc(smoothed.x, smoothed.y, 5, 0, 2 * Math.PI);
            ctx.fill();
          }
        }
      }

      // Continue detection loop
      animationFrameId = requestAnimationFrame(detectHands);
    };

    const startDetection = async () => {
      await initializeCamera();
      await initializeHandDetection();
      detectHands();
    };

    startDetection();

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      if (videoStream) {
        videoStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return (
    <Container>
      <Video ref={videoRef} autoPlay playsInline />
      <DarkOverlay />
      <Canvas ref={canvasRef} />
      <DebugPanel>
        {debugPoints.map((point, index) => (
          <PointInfo key={index}>
            Hand {point.hand} - {HAND_LANDMARK_NAMES[point.point]}: ({point.x},{" "}
            {point.y})
          </PointInfo>
        ))}
        {Object.entries(measurements).map(([key, value]) => (
          <MeasurementInfo key={key}>
            {key.includes("pinch") ? "Pinch Distance" : key}: {value}px
          </MeasurementInfo>
        ))}
      </DebugPanel>
    </Container>
  );
}
