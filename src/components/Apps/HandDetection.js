import styled from "styled-components";
import Loading from "../UI/Loading";
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
  background-color: ${(props) => props.theme.background};
`;

const Label = styled.div`
  color: ${(props) => props.theme.menuText};
  font-size: ${(props) => props.theme.fontSize};
  text-transform: ${(props) => props.theme.textTransform};
  text-align: center;
  z-index: 10;
`;

const Circle = styled.div`
  position: absolute;
  border: 2px solid ${(props) => props.theme.text};
  border-radius: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
`;

export default function HandDetection() {
  const { points, measurements, isLoading } = useHandDetection();

  if (isLoading) {
    return <Loading />;
  }

  return (
    <Container>
      {points.length === 0 ? (
        <Label>Raise your hands</Label>
      ) : (
        points
          .filter((point) => point.point === 8)
          .map((point, index) => {
            const handId = `hand${point.hand}`;
            const radius = measurements[handId]?.indexThumbPinchDistance;

            return (
              <Circle
                key={`${handId}-${index}`}
                style={{
                  left: `${point.x}px`,
                  top: `${point.y}px`,
                  width: `${radius * 2}px`,
                  height: `${radius * 2}px`
                }}
              />
            );
          })
      )}
    </Container>
  );
}
