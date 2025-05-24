import styled from "styled-components";
import { useHandDetection } from "../../../functions/HandDetectionContext";
import { useSerial } from "../../../functions/SerialDataContext";

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: ${(props) => props.theme.menuText};
  width: 100%;
  height: 100%;
  position: relative;
  background-color: #000000;
`;

const Video = styled.video`
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: ${(props) => props.opacity};
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

export default function CameraHandDetection() {
  const { videoRef, canvasRef, landmarks, measurements } = useHandDetection();
  const { serialData } = useSerial();

  return (
    <Container>
      <Video
        ref={videoRef}
        autoPlay
        playsInline
        opacity={(serialData["vertical_slider_1"]?.value || 0) / 100}
      />
      <Canvas ref={canvasRef} />
      <DebugPanel>
        {landmarks.map((point, index) => (
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
