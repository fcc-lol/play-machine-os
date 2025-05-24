import styled from "styled-components";
import { useEffect, useRef } from "react";
import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: ${(props) => props.theme.menuText};
  width: 100%;
  height: 100%;
`;

const Video = styled.video`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const Canvas = styled.canvas`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
`;

export default function CameraHandDetection() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const handLandmarkerRef = useRef(null);

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

      // Draw hand landmarks
      if (results.landmarks) {
        for (const landmarks of results.landmarks) {
          ctx.fillStyle = "#00FF00";
          for (const landmark of landmarks) {
            ctx.beginPath();
            ctx.arc(
              landmark.x * canvas.width,
              landmark.y * canvas.height,
              5,
              0,
              2 * Math.PI
            );
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
      <Canvas ref={canvasRef} />
    </Container>
  );
}
