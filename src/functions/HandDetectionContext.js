import React, {
  createContext,
  useContext,
  useRef,
  useState,
  useCallback,
  useEffect
} from "react";
import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";

const HandDetectionContext = createContext();

// Smoothing utility
const createSmoothingFilter = (windowSize = 5) => {
  const points = new Array(windowSize).fill(null);
  let currentIndex = 0;

  return {
    addPoint: (x, y) => {
      points[currentIndex] = { x, y };
      currentIndex = (currentIndex + 1) % windowSize;

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

export function HandDetectionProvider({ children }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const handLandmarkerRef = useRef(null);
  const [landmarks, setLandmarks] = useState([]);
  const [measurements, setMeasurements] = useState({});
  const smoothingFiltersRef = useRef({});

  const detectHands = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !handLandmarkerRef.current)
      return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const results = handLandmarkerRef.current.detect(video);
    const points = [];
    const newMeasurements = {};

    if (results.landmarks) {
      results.landmarks.forEach((landmarks, handIndex) => {
        const smoothedPoints = {};

        landmarks.forEach((landmark, pointIndex) => {
          const key = `hand${handIndex}_point${pointIndex}`;

          if (!smoothingFiltersRef.current[key]) {
            smoothingFiltersRef.current[key] = createSmoothingFilter(5);
          }

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

        // Draw hand landmarks
        ctx.fillStyle = "#00FF00";
        for (const landmark of landmarks) {
          const key = `hand${handIndex}_point${landmarks.indexOf(landmark)}`;
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

        // Draw pinch measurement if available
        if (smoothedPoints[4] && smoothedPoints[8]) {
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

    setLandmarks(points);
    setMeasurements(newMeasurements);

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
        landmarks,
        measurements
      }}
    >
      {children}
    </HandDetectionContext.Provider>
  );
}

export function useHandDetection() {
  return useContext(HandDetectionContext);
}
