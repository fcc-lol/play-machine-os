import React, { useState, useCallback, useEffect } from "react";
import styled from "styled-components";
import { useSocket } from "../../../functions/SocketContext";

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

function RemoteViewer() {
  const [remotes, setRemotes] = useState({});
  const { isConnected, error, registerHandler } = useSocket();

  // Handle incoming socket messages
  const handleMessage = useCallback((data) => {
    if (data.action === "remoteRegistration") {
      // Add new remote to the list
      setRemotes((prev) => {
        // Remove sample remote if it exists
        const { "sample-remote": _, ...rest } = prev;
        return {
          ...rest,
          [data.data.deviceId]: {
            deviceType: data.data.deviceType,
            value: null
          }
        };
      });
    } else if (data.action === "remoteSerialData") {
      // Update remote data
      setRemotes((prev) => {
        // Remove sample remote if it exists
        const { "sample-remote": _, ...rest } = prev;
        return {
          ...rest,
          [data.data.deviceId]: {
            ...prev[data.data.deviceId],
            value: data.data.value
          }
        };
      });
    }
  }, []);

  // Register our message handler
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
                <Value>{remote.deviceType}</Value>
              </DataItem>
              <DataItem>
                <Label>Identifier</Label>
                <Value>{deviceId}</Value>
              </DataItem>
              {remote.value !== null && (
                <DataItem>
                  <Label>Value</Label>
                  <Value>{remote.value}</Value>
                </DataItem>
              )}
            </RemoteData>
          </RemoteCard>
        ))}
      </RemoteList>
    </Page>
  );
}

export default RemoteViewer;
