import styled, { css } from "styled-components";
import { useHandDetection } from "../../../functions/HandDetectionContext";
import { useSerial } from "../../../functions/SerialDataContext";
import { useEffect } from "react";
import Loading from "../Loading";

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

const Canvas = styled.canvas(css`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 2;
  transform: scaleX(-1);
`);

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

const Data = styled.div`
  font-size: 1rem;
  position: absolute;
  top: 0.5rem;
  left: 1rem;
  width: 100%;
  color: ${(props) => props.theme.menuText};
  overflow-y: auto;
  z-index: 1000;
`;

const Label = styled.div`
  font-weight: bold;
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;
  text-transform: ${(props) => props.theme.textTransform};
`;

const DataList = styled.div`
  margin-bottom: 1rem;
  min-width: 25%;
  color: ${(props) => props.theme.menuText};
`;

const DataListItem = styled.div`
  text-transform: ${(props) => props.theme.textTransform};
`;

export default function CameraHandDetection() {
  const {
    videoRef,
    canvasRef,
    points,
    measurements,
    HAND_LANDMARK_NAMES,
    setVideoProps,
    isLoading
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
      {isLoading && <Loading />}
      {points.length === 0 && <Label>Raise your hand</Label>}
      <Video
        ref={videoRef}
        autoPlay
        playsInline
        opacity={(serialData["vertical_slider_1"]?.value || 0) / 100}
      />
      <Canvas ref={canvasRef} />
      <Data>
        {points.length > 0 && <Label>Points</Label>}
        <DataList>
          {points.map((point, index) => (
            <DataListItem key={index}>
              Hand {point.hand}: {HAND_LANDMARK_NAMES[point.point]}: {point.x},
              {point.y},{point.z.toFixed(2)}
            </DataListItem>
          ))}
        </DataList>
        {Object.keys(measurements).length > 0 && <Label>Measurements</Label>}
        <DataList>
          {Object.entries(measurements).map(([handId, params]) => (
            <DataListItem key={handId}>
              {Object.entries(params).map(([key, value]) => (
                <div key={key}>
                  {key}: {value}
                </div>
              ))}
            </DataListItem>
          ))}
        </DataList>
      </Data>
    </Container>
  );
}
