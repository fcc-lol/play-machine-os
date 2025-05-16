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
  margin-bottom: 2rem;
  font-weight: bold;
`;

const Message = styled.div`
  color: ${(props) => props.theme.text};
  font-family: ${(props) => props.theme.fontFamily};
  text-transform: ${(props) => props.theme.textTransform};
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
      {error && <pre>{error}</pre>}
      <StatusIndicator connected={isConnected}>
        {isConnected
          ? "Connected to socket server"
          : "Disconnected from socket server"}
      </StatusIndicator>
      {messageLog.map((message, index) => (
        <Message key={index} type={message.type}>
          [{message.timestamp}] {message.type} {message.action}
        </Message>
      ))}
    </Page>
  );
}

export default SocketEventsViewer;
