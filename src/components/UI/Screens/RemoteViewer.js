import React, { useState, useCallback, useEffect } from "react";
import styled from "styled-components";
import { useSocket } from "../../../functions/SocketContext";
import { useSerial } from "../../../functions/SerialDataContext";

const Page = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: flex-start;
  padding: 2rem;
  font-size: 1.5rem;
  height: calc(100% - 4rem);
  width: calc(100% - 4rem);
  gap: 1rem;
`;

const StatusIndicator = styled.div`
  color: ${(props) => props.theme.text};
  font-family: ${(props) => props.theme.fontFamily};
  text-transform: ${(props) => props.theme.textTransform};
  margin-bottom: 1.5rem;
  font-weight: bold;
`;

const RemoteList = styled.div`
  display: flex;
  flex-direction: row;
  gap: 1rem;
`;

const RemoteCard = styled.div`
  background: ${(props) => props.theme.background};
  border: 2px solid ${(props) => props.theme.text};
  border-radius: 0.5rem;
  padding: 1rem;
  width: 100%;
`;

const RemoteData = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const DataItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const Label = styled.span`
  color: ${(props) => props.theme.text};
  opacity: 0.7;
  width: 6rem;
`;

const Value = styled.span`
  color: ${(props) => props.theme.text};
  font-weight: bold;
`;

const ButtonState = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid ${(props) => props.theme.text};
`;

const ButtonStateItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

function RemoteViewer() {
  const [remotes, setRemotes] = useState({});
  const { isConnected, error, registerHandler } = useSocket();
  const { selectedControl, hasActiveRemotes } = useSerial();

  const handleMessage = useCallback((data) => {
    if (data.action === "remoteRegistration") {
      setRemotes((prev) => ({
        ...prev,
        [data.data.deviceId]: {
          deviceType: data.data.deviceType || "Unknown",
          value: null,
          encoderButton: false,
          confirmButton: false,
          backButton: false,
          batteryVoltage: null
        }
      }));
    } else if (data.action === "remoteSerialData") {
      setRemotes((prev) => ({
        ...prev,
        [data.data.deviceId]: {
          ...prev[data.data.deviceId],
          deviceType:
            prev[data.data.deviceId]?.deviceType ||
            data.data.deviceType ||
            "Unknown",
          value: data.data.value,
          encoderButton: data.data.encoderButton || false,
          confirmButton: data.data.confirmButton || false,
          backButton: data.data.backButton || false,
          batteryVoltage: data.data.batteryVoltage || null
        }
      }));
    }
  }, []);

  useEffect(() => {
    if (isConnected) {
      const cleanup = registerHandler(handleMessage);
      return cleanup;
    }
  }, [isConnected, registerHandler, handleMessage]);

  return (
    <Page>
      <StatusIndicator connected={isConnected}>
        {error
          ? error
          : isConnected
          ? "Connected to socket server"
          : "Disconnected from socket server"}
      </StatusIndicator>
      <RemoteList>
        {Object.entries(remotes).map(([deviceId, remote]) => (
          <RemoteCard key={deviceId}>
            <RemoteData>
              <DataItem>
                <Label>Type</Label>
                <Value>{remote.deviceType || "Unknown"}</Value>
              </DataItem>
              <DataItem>
                <Label>Identifier</Label>
                <Value>{deviceId}</Value>
              </DataItem>
              {hasActiveRemotes && selectedControl && (
                <DataItem>
                  <Label>Target</Label>
                  <Value>{selectedControl.label}</Value>
                </DataItem>
              )}
              {remote.value !== null && (
                <DataItem>
                  <Label>Value</Label>
                  <Value>{remote.value || "???"}</Value>
                </DataItem>
              )}
              <DataItem>
                <Label>Battery</Label>
                <Value>
                  {remote.batteryVoltage !== null
                    ? `${remote.batteryVoltage}V`
                    : "???"}
                </Value>
              </DataItem>
              <ButtonState>
                <ButtonStateItem>
                  <Label>Encoder</Label>
                  <Value>{remote.encoderButton ? "Pressed" : "Released"}</Value>
                </ButtonStateItem>
                <ButtonStateItem>
                  <Label>Confirm</Label>
                  <Value>{remote.confirmButton ? "Pressed" : "Released"}</Value>
                </ButtonStateItem>
                <ButtonStateItem>
                  <Label>Back</Label>
                  <Value>{remote.backButton ? "Pressed" : "Released"}</Value>
                </ButtonStateItem>
              </ButtonState>
            </RemoteData>
          </RemoteCard>
        ))}
      </RemoteList>
    </Page>
  );
}

export default RemoteViewer;
