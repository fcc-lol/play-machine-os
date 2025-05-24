import React, {
  createContext,
  useContext,
  useRef,
  useState,
  useCallback,
  useEffect
} from "react";
import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";
import styled from "styled-components";
import hardware from "../config/Hardware.json";

const HandDetectionContext = createContext();

const Video = styled.video`
  position: absolute;
  width: ${hardware.screen.width}px;
  height: ${hardware.screen.height}px;
  object-fit: cover;
  opacity: ${(props) => props.opacity ?? 1};
  pointer-events: none;
`;

// Hand landmark names
export const HAND_LANDMARK_NAMES = {
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
    addPoint: (x, y, z) => {
      points[currentIndex] = { x, y, z };
      currentIndex = (currentIndex + 1) % windowSize;

      const validPoints = points.filter((p) => p !== null);
      if (validPoints.length === 0) return { x, y, z };

      const sum = validPoints.reduce(
        (acc, point) => ({
          x: acc.x + point.x,
          y: acc.y + point.y,
          z: acc.z + point.z
        }),
        { x: 0, y: 0, z: 0 }
      );

      return {
        x: Math.round(sum.x / validPoints.length),
        y: Math.round(sum.y / validPoints.length),
        z: sum.z / validPoints.length
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

export function HandDetectionProvider({ children }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const handLandmarkerRef = useRef(null);
  const [handPoints, setHandPoints] = useState([]);
  const [interpretedParams, setInterpretedParams] = useState({});
  const smoothingFiltersRef = useRef({});
  const [videoProps, setVideoProps] = useState({
    opacity: 1,
    fullWidth: false,
    fullHeight: false
  });

  const detectHands = useCallback(async () => {
    if (!videoRef.current || !handLandmarkerRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");

    if (canvas && ctx) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    const results = handLandmarkerRef.current.detect(video);
    const points = [];
    const newInterpretedParams = {};

    if (results.landmarks) {
      results.landmarks.forEach((landmarks, handIndex) => {
        const smoothedPoints = {};

        landmarks.forEach((landmark, pointIndex) => {
          const key = `hand${handIndex}_point${pointIndex}`;

          if (!smoothingFiltersRef.current[key]) {
            smoothingFiltersRef.current[key] = createSmoothingFilter(5);
          }

          const smoothed = smoothingFiltersRef.current[key].addPoint(
            Math.round(landmark.x * video.videoWidth),
            Math.round(landmark.y * video.videoHeight),
            landmark.z
          );

          smoothedPoints[pointIndex] = smoothed;

          points.push({
            hand: handIndex + 1,
            point: pointIndex,
            x: smoothed.x,
            y: smoothed.y,
            z: smoothed.z
          });
        });

        // Calculate parameters for each hand
        if (smoothedPoints[4] && smoothedPoints[8]) {
          newInterpretedParams[`hand${handIndex + 1}`] = {
            indexThumbPinchDistance: calculateDistance(
              smoothedPoints[4],
              smoothedPoints[8]
            )
          };
        }

        // Draw hand landmarks and measurements if canvas is available
        if (canvas && ctx) {
          // Draw hand landmarks
          ctx.fillStyle = "#00FF00";
          for (const landmark of landmarks) {
            const key = `hand${handIndex}_point${landmarks.indexOf(landmark)}`;
            const smoothed = smoothingFiltersRef.current[key]?.addPoint(
              Math.round(landmark.x * video.videoWidth),
              Math.round(landmark.y * video.videoHeight),
              landmark.z
            ) || {
              x: landmark.x * video.videoWidth,
              y: landmark.y * video.videoHeight,
              z: landmark.z
            };

            ctx.beginPath();
            ctx.arc(smoothed.x, smoothed.y, 5, 0, 2 * Math.PI);
            ctx.fill();
          }

          // Draw pinch measurement if available
          if (smoothedPoints[4] && smoothedPoints[8]) {
            const distance = calculateDistance(
              smoothedPoints[4],
              smoothedPoints[8]
            );

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
        }
      });
    }

    setHandPoints(points);
    setInterpretedParams(newInterpretedParams);

    requestAnimationFrame(detectHands);
  }, []);

  useEffect(() => {
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

    const startDetection = async () => {
      await initializeCamera();
      await initializeHandDetection();
      detectHands();
    };

    startDetection();

    return () => {
      if (videoStream) {
        videoStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [detectHands]);

  return (
    <HandDetectionContext.Provider
      value={{
        videoRef,
        canvasRef,
        handPoints,
        interpretedParams,
        HAND_LANDMARK_NAMES,
        setVideoProps
      }}
    >
      <Video
        ref={videoRef}
        autoPlay
        playsInline
        opacity={videoProps.opacity}
        fullWidth={videoProps.fullWidth}
        fullHeight={videoProps.fullHeight}
      />
      {children}
    </HandDetectionContext.Provider>
  );
}

export function useHandDetection() {
  const context = useContext(HandDetectionContext);
  if (!context) {
    throw new Error(
      "useHandDetection must be used within a HandDetectionProvider"
    );
  }
  return context;
}
