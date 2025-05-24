import styled from "styled-components";
import { useHandDetection } from "../../../functions/HandDetectionContext";
import { useSerial } from "../../../functions/SerialDataContext";
import { useEffect } from "react";

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

const Canvas = styled.canvas`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 2;
`;

const Video = styled.video`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: 1;
  opacity: ${(props) => props.opacity};
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

export default function CameraHandDetection() {
  const {
    videoRef,
    canvasRef,
    handPoints,
    interpretedParams,
    HAND_LANDMARK_NAMES,
    setVideoProps
  } = useHandDetection();
  const { serialData } = useSerial();

  useEffect(() => {
    setVideoProps({
      opacity: (serialData["vertical_slider_1"]?.value || 0) / 100,
      fullWidth: true,
      fullHeight: true
    });
  }, [serialData, setVideoProps]);

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
        {handPoints.map((point, index) => (
          <PointInfo key={index}>
            Hand {point.hand} - {HAND_LANDMARK_NAMES[point.point]}: ({point.x},{" "}
            {point.y})
          </PointInfo>
        ))}
        {Object.entries(interpretedParams).map(([handId, params]) => (
          <MeasurementInfo key={handId}>
            {handId} - Pinch Distance: {params.indexThumbPinchDistance}px
          </MeasurementInfo>
        ))}
      </DebugPanel>
    </Container>
  );
}
