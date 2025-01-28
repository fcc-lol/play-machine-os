import React from "react";
import { useSerial } from "../SerialDataContext";
import styled from "styled-components";

const DebugContainer = styled.div`
  margin-top: 1rem;
  color: #ffffff;
`;

const DebugTitle = styled.h3`
  font-size: 1rem;
  font-weight: bold;
`;

const DebugList = styled.ul`
  list-style-type: none;
  padding: 0;
`;

const DebugListItem = styled.li`
  margin-bottom: 1rem;
`;

const DebugView = () => {
  const { serialData, isConnected } = useSerial();

  return (
    isConnected && (
      <DebugContainer>
        <DebugTitle>Debug View</DebugTitle>
        <p>Number of data points: {Object.keys(serialData).length}</p>
        <DebugList>
          {Object.entries(serialData).map(([key, value]) => (
            <DebugListItem key={key}>
              {key}: {JSON.stringify(value)}
            </DebugListItem>
          ))}
        </DebugList>
      </DebugContainer>
    )
  );
};

export default DebugView;
