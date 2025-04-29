import React from "react";
import styled from "styled-components";
import { useSerial } from "../../../functions/SerialDataContext";
import hardwareConfig from "../../../config/Hardware.json";

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

export default function PhysicalInputMonitor() {
  const { serialData, isInputConnected, isOutputConnected, isSimulatorMode } =
    useSerial();

  // Get all button labels from hardwareConfig
  const allButtonLabels = Object.entries(hardwareConfig.buttons).map(
    ([id, label]) => label
  );

  // Split the data into two columns
  const allItems = [
    {
      key: "Hardware",
      value: isSimulatorMode
        ? "Simulator"
        : isInputConnected && isOutputConnected
        ? "Connected"
        : "Disconnected"
    },
    // Add all other serial data items first
    ...Object.entries(serialData)
      .filter(([key]) => !allButtonLabels.includes(key))
      .map(([key, data]) => ({
        key,
        value: JSON.stringify(data.value)
      })),
    // Add all buttons with their current values at the bottom
    ...allButtonLabels.map((label) => ({
      key: label,
      value: serialData[label]?.value ?? false
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
            <Value>{String(item.value).toUpperCase()}</Value>
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
            <Value>{String(item.value).toUpperCase()}</Value>
          </DebugItem>
        ))}
      </Column>
    </Root>
  );
}
