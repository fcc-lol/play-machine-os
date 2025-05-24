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
import { useTheme } from "./ThemeContext";

const HandDetectionContext = createContext();

const Video = styled.video`
  position: absolute;
  width: ${hardware.screen.width}px;
  height: ${hardware.screen.height}px;
  object-fit: cover;
  opacity: ${(props) => props.opacity ?? 1};
  pointer-events: none;
`;

const Canvas = styled.canvas`
  position: absolute;
  width: ${hardware.screen.width}px;
  height: ${hardware.screen.height}px;
  -moz-transform: scale(-1, 1);
  -webkit-transform: scale(-1, 1);
  -o-transform: scale(-1, 1);
  transform: scale(-1, 1);
  filter: FlipH;
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
  const [points, setpoints] = useState([]);
  const [measurements, setmeasurements] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const { themeValues } = useTheme();
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
    const newmeasurements = {};

    if (results.landmarks) {
      results.landmarks.forEach((landmarks, handIndex) => {
        landmarks.forEach((landmark, pointIndex) => {
          const x = Math.round(landmark.x * video.videoWidth);
          const y = Math.round(landmark.y * video.videoHeight);
          const z = landmark.z;

          // Mirror the x coordinate for the points array
          const mirroredX = video.videoWidth - x;

          points.push({
            hand: handIndex + 1,
            point: pointIndex,
            x: mirroredX,
            y: y,
            z: z
          });
        });

        // Calculate parameters for each hand
        if (landmarks[4] && landmarks[8]) {
          const point4 = {
            x: Math.round(landmarks[4].x * video.videoWidth),
            y: Math.round(landmarks[4].y * video.videoHeight)
          };
          const point8 = {
            x: Math.round(landmarks[8].x * video.videoWidth),
            y: Math.round(landmarks[8].y * video.videoHeight)
          };

          // Create mirrored points for distance calculation
          const mirroredPoint4 = {
            x: video.videoWidth - point4.x,
            y: point4.y
          };
          const mirroredPoint8 = {
            x: video.videoWidth - point8.x,
            y: point8.y
          };

          newmeasurements[`hand${handIndex + 1}`] = {
            indexThumbPinchDistance: calculateDistance(
              mirroredPoint4,
              mirroredPoint8
            )
          };
        }

        // Draw hand landmarks and measurements if canvas is available
        if (canvas && ctx) {
          // Draw hand landmarks
          ctx.fillStyle = themeValues.text;
          for (const landmark of landmarks) {
            const x = Math.round(landmark.x * video.videoWidth);
            const y = Math.round(landmark.y * video.videoHeight);

            ctx.beginPath();
            ctx.arc(x, y, 5, 0, 2 * Math.PI);
            ctx.fill();
          }

          // Draw pinch measurement if available
          if (landmarks[4] && landmarks[8]) {
            const point4 = {
              x: Math.round(landmarks[4].x * video.videoWidth),
              y: Math.round(landmarks[4].y * video.videoHeight)
            };
            const point8 = {
              x: Math.round(landmarks[8].x * video.videoWidth),
              y: Math.round(landmarks[8].y * video.videoHeight)
            };

            ctx.beginPath();
            ctx.moveTo(point4.x, point4.y);
            ctx.lineTo(point8.x, point8.y);
            ctx.strokeStyle = themeValues.text;
            ctx.lineWidth = 2;
            ctx.stroke();
          }
        }
      });
    }

    setpoints(points);
    setmeasurements(newmeasurements);

    requestAnimationFrame(detectHands);
  }, [themeValues]);

  useEffect(() => {
    let videoStream;

    const initializeCamera = async () => {
      try {
        videoStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: 1280,
            height: 720,
            facingMode: "user"
          }
        });
        if (videoRef.current) {
          videoRef.current.srcObject = videoStream;
          // Apply the mirroring transform
          videoRef.current.style.cssText =
            "-moz-transform: scale(-1, 1); -webkit-transform: scale(-1, 1); -o-transform: scale(-1, 1); transform: scale(-1, 1); filter: FlipH;";
        }
      } catch (error) {
        console.error("Error accessing webcam:", error);
        setIsLoading(false);
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
        setIsLoading(false);
      }
    };

    const startDetection = async () => {
      setIsLoading(true);
      await initializeCamera();
      await initializeHandDetection();
      detectHands();
      setIsLoading(false);
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
        points,
        measurements,
        HAND_LANDMARK_NAMES,
        setVideoProps,
        isLoading
      }}
    >
      <Video ref={videoRef} autoPlay playsInline opacity={videoProps.opacity} />
      <Canvas ref={canvasRef} />
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
