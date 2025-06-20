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
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const RemoteIndicator = styled.span`
  background: ${(props) => props.theme.menuText};
  color: ${(props) => props.theme.menuBackground};
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 1rem;
  font-weight: bold;
  text-transform: uppercase;
`;

const Value = styled.span`
  font-size: 1.5rem;
`;

export default function PhysicalInputMonitor() {
  const {
    serialData,
    isInputConnected,
    isOutputConnected,
    isSimulatorMode,
    hasActiveRemotes,
    remoteControlMappings
  } = useSerial();

  // Get all button labels from hardwareConfig
  const allButtonLabels = Object.entries(hardwareConfig.buttons).map(
    ([id, label]) => label
  );

  // Get all potentiometer labels from hardwareConfig
  const allPotentiometerLabels = Object.entries(
    hardwareConfig.potentiometers
  ).map(([id, config]) => config.label);

  // Create a set of all legitimate hardware keys
  const legitimateHardwareKeys = new Set([
    ...allButtonLabels,
    ...allPotentiometerLabels
  ]);

  // Function to check if a control is being overridden by remote
  const isRemoteOverride = (key) => {
    return (
      hasActiveRemotes &&
      Object.values(remoteControlMappings).some(
        (control) => control?.id === key
      )
    );
  };

  // Function to get the remote device ID for a specific control
  const getRemoteDeviceIdForControl = (controlKey) => {
    if (!hasActiveRemotes) return null;

    // Find which remote device is assigned to this control
    const deviceId = Object.entries(remoteControlMappings).find(
      ([deviceId, control]) => control?.id === controlKey
    )?.[0];

    return deviceId || null;
  };

  // Split the data into two columns
  const allItems = [
    {
      key: "Hardware",
      value: isSimulatorMode
        ? "Simulator"
        : isInputConnected && isOutputConnected
        ? "Connected"
        : "Disconnected",
      isRemoteOverride: false,
      remoteDeviceId: null
    },
    // Add all other serial data items that correspond to actual hardware
    ...Object.entries(serialData)
      .filter(
        ([key]) =>
          legitimateHardwareKeys.has(key) && !allButtonLabels.includes(key)
      )
      .map(([key, data]) => ({
        key,
        value: JSON.stringify(data.value),
        isRemoteOverride: isRemoteOverride(key),
        remoteDeviceId: isRemoteOverride(key)
          ? getRemoteDeviceIdForControl(key)
          : null
      })),
    // Add all buttons with their current values at the bottom
    ...allButtonLabels.map((label) => ({
      key: label,
      value: serialData[label]?.value ?? false,
      isRemoteOverride: isRemoteOverride(label),
      remoteDeviceId: isRemoteOverride(label)
        ? getRemoteDeviceIdForControl(label)
        : null
    }))
  ];

  const midPoint = Math.ceil(allItems.length / 2);
  const leftColumn = allItems.slice(0, midPoint);
  const rightColumn = allItems.slice(midPoint);

  return (
    <Root>
      <Column>
        {leftColumn.map((item) => (
          <DebugItem key={item.key} isRemoteOverride={item.isRemoteOverride}>
            <Label>
              {item.key
                .replace(/_/g, " ")
                .replace(/\b\w/g, (c) => c.toUpperCase())}
              {item.isRemoteOverride && (
                <RemoteIndicator>
                  Remote {item.remoteDeviceId || "Unknown"}
                </RemoteIndicator>
              )}
            </Label>
            <Value>{String(item.value).toUpperCase()}</Value>
          </DebugItem>
        ))}
      </Column>
      <Column>
        {rightColumn.map((item) => (
          <DebugItem key={item.key} isRemoteOverride={item.isRemoteOverride}>
            <Label>
              {item.key
                .replace(/_/g, " ")
                .replace(/\b\w/g, (c) => c.toUpperCase())}
              {item.isRemoteOverride && (
                <RemoteIndicator>
                  Remote {item.remoteDeviceId || "Unknown"}
                </RemoteIndicator>
              )}
            </Label>
            <Value>{String(item.value).toUpperCase()}</Value>
          </DebugItem>
        ))}
      </Column>
    </Root>
  );
}
