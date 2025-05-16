import React, { useState, useCallback } from "react";
import styled from "styled-components";
import { useSocketConnection } from "../../../functions/SocketConnection";

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

  const handleMessage = useCallback((data) => {
    // Log the received getSerialData request
    setMessageLog((prev) => [
      {
        type: "received",
        action: "getSerialData",
        timestamp: new Date().toISOString()
      },
      ...prev
    ]);

    // Log our serialData response
    setMessageLog((prev) => [
      {
        type: "sent",
        action: "serialData",
        data,
        timestamp: new Date().toISOString()
      },
      ...prev
    ]);
  }, []);

  const { isConnected, error } = useSocketConnection("local", handleMessage);

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
