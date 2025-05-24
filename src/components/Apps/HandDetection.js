import styled from "styled-components";
import { useHandDetection } from "../../functions/HandDetectionContext";

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

const Circle = styled.div`
  position: absolute;
  border: 2px solid #00ff00;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
`;

export default function HandDetection() {
  const { videoRef, handPoints, interpretedParams } = useHandDetection();

  return (
    <Container>
      {handPoints
        .filter((point) => point.point === 8)
        .map((point, index) => {
          const videoWidth = videoRef.current?.videoWidth || 1280;
          const handId = `hand${point.hand}`;
          const radius =
            interpretedParams[handId]?.indexThumbPinchDistance || 20;

          return (
            <Circle
              key={`${point.hand}-${index}`}
              style={{
                left: `${videoWidth - point.x}px`,
                top: `${point.y}px`,
                width: `${radius * 2}px`,
                height: `${radius * 2}px`
              }}
            />
          );
        })}
    </Container>
  );
}
