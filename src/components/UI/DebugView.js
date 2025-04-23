import React from "react";
import { useSerial } from "../../SerialDataContext";
import styled from "styled-components";

const DebugContainer = styled.div`
  color: #ffffff;
  margin-top: -5rem;
`;

const DebugList = styled.ul`
  list-style-type: none;
  padding: 0;
`;

const DebugListItem = styled.li`
  margin-bottom: 0;
`;

export default function DebugView() {
  const { serialData, isConnected } = useSerial();

  return (
    isConnected && (
      <DebugContainer>
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
}
