import React from "react";
import styled from "styled-components";
import { useSerial } from "../../../functions/SerialDataContext";

const Root = styled.div`
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  justify-content: flex-start;
  height: calc(100% - 8rem);
  width: calc(100% - 8rem);
  color: ${(props) => props.theme.text};
  font-family: ${(props) => props.theme.fontFamily};
  gap: 2rem;
  margin: 4rem;
`;

const Column = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0;
  flex: 1;
  height: 100%;
`;

const DebugItem = styled.div`
  display: flex;
  align-items: center;
  height: 100%;
  justify-content: space-between;
  padding: 1rem;
  border-bottom: 1px solid ${(props) => props.theme.border};

  &:last-child {
    border-bottom: none;
  }
`;

const Label = styled.span`
  font-weight: bold;
  font-size: 1.5rem;
`;

const Value = styled.span`
  font-size: 1.5rem;
`;

export default function Debugger() {
  const { serialData, isConnected, isSimulatorMode } = useSerial();

  // Split the data into two columns
  const allItems = [
    {
      key: "Hardware",
      value: isSimulatorMode
        ? "Simulator"
        : isConnected
        ? "Connected"
        : "Disconnected"
    },
    ...Object.entries(serialData).map(([key, data]) => ({
      key,
      value: JSON.stringify(data.value)
    }))
  ];

  const midPoint = Math.ceil(allItems.length / 2);
  const leftColumn = allItems.slice(0, midPoint);
  const rightColumn = allItems.slice(midPoint);

  return (
    <Root>
      <Column>
        {leftColumn.map((item) => (
          <DebugItem key={item.key}>
            <Label>
              {item.key
                .replace(/_/g, " ")
                .replace(/\b\w/g, (c) => c.toUpperCase())}
              :
            </Label>
            <Value>{item.value.toUpperCase()}</Value>
          </DebugItem>
        ))}
      </Column>
      <Column>
        {rightColumn.map((item) => (
          <DebugItem key={item.key}>
            <Label>
              {item.key
                .replace(/_/g, " ")
                .replace(/\b\w/g, (c) => c.toUpperCase())}
              :
            </Label>
            <Value>{item.value.toUpperCase()}</Value>
          </DebugItem>
        ))}
      </Column>
    </Root>
  );
}
