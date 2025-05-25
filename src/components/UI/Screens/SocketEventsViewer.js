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

const Message = styled.div`
  color: ${(props) => props.theme.text};
  font-family: ${(props) => props.theme.fontFamily};
  text-transform: ${(props) => props.theme.textTransform};
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  width: 100%;
`;

const Data = styled.div`
  font-weight: bold;
`;

const Timestamp = styled.div`
  opacity: 0.5;
`;

function SocketEventsViewer() {
  const [messageLog, setMessageLog] = useState([]);
  const { isConnected, error, registerHandler } = useSocket();
  const { serialData, setSerialData } = useSerial();

  // Keep track of latest serial data for responding to requests
  const latestSerialDataRef = React.useRef(serialData);
  const setSerialDataRef = React.useRef(null);
  const hardwareStateAtSetSerialDataRef = React.useRef(null);

  useEffect(() => {
    // If we have stored hardware state and current data differs from it,
    // it means the hardware has actually changed from its state when we received setSerialData
    if (
      hardwareStateAtSetSerialDataRef.current &&
      JSON.stringify(serialData) !==
        JSON.stringify(hardwareStateAtSetSerialDataRef.current)
    ) {
      setSerialDataRef.current = null;
      hardwareStateAtSetSerialDataRef.current = null;
    }
    latestSerialDataRef.current = serialData;
  }, [serialData]);

  // Handle incoming socket messages
  const handleMessage = useCallback(
    (data) => {
      // Skip logging if it's a serialData message with isFromSelf flag
      if (data.action === "serialData" && data.isFromSelf) {
        return;
      }

      // Handle setSerialData events
      if (data.action === "setSerialData") {
        setMessageLog((prev) => [
          {
            type: "received",
            action: "setSerialData",
            data: data.data,
            timestamp: new Date().toISOString()
          },
          ...prev
        ]);

        // Access the nested data structure correctly
        const serialDataValues = data.data.data;
        setSerialDataRef.current = serialDataValues;
        // Store the current hardware state when we receive setSerialData
        hardwareStateAtSetSerialDataRef.current = JSON.parse(
          JSON.stringify(serialData)
        );
        setSerialData(serialDataValues);
        return;
      }

      // Log all incoming messages
      setMessageLog((prev) => [
        {
          type: "received",
          action: data.action,
          data: data.data,
          timestamp: new Date().toISOString()
        },
        ...prev
      ]);

      // Handle getSerialData requests
      if (data.action === "getSerialData") {
        // Use setSerialData if available, otherwise use latest serial data
        const dataToSend =
          setSerialDataRef.current || latestSerialDataRef.current;

        // Log our response
        setMessageLog((prev) => [
          {
            type: "sent",
            action: "serialData",
            data: dataToSend,
            timestamp: new Date().toISOString()
          },
          ...prev
        ]);
      }
    },
    [setSerialData]
  );

  // Register our message handler
  useEffect(() => {
    if (isConnected) {
      // Register handler and get cleanup function
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
      {messageLog.map((message, index) => (
        <Message key={index} type={message.type}>
          <Data>
            {message.type} {message.action}
          </Data>
          <Timestamp>{message.timestamp}</Timestamp>
        </Message>
      ))}
    </Page>
  );
}

export default SocketEventsViewer;
