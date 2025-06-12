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
  const { isConnected, error, registerHandler, registerOutgoingHandler } =
    useSocket();

  // Handle incoming socket messages
  const handleIncomingMessage = useCallback((data) => {
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
  }, []);

  // Handle outgoing socket messages
  const handleOutgoingMessage = useCallback((message) => {
    // Parse message if it's a string, otherwise use as-is
    const parsedMessage =
      typeof message === "string" ? JSON.parse(message) : message;

    console.log("outgoing message", parsedMessage);

    // Log all outgoing messages
    setMessageLog((prev) => [
      {
        type: "sent",
        action: parsedMessage.action,
        data: parsedMessage.data,
        timestamp: new Date().toISOString()
      },
      ...prev
    ]);
  }, []);

  // Register our message handlers
  useEffect(() => {
    if (isConnected) {
      // Register handler for incoming messages and get cleanup function
      const cleanupIncoming = registerHandler(handleIncomingMessage);
      // Register handler for outgoing messages and get cleanup function
      const cleanupOutgoing = registerOutgoingHandler(handleOutgoingMessage);

      return () => {
        cleanupIncoming();
        cleanupOutgoing();
      };
    }
  }, [
    isConnected,
    registerHandler,
    registerOutgoingHandler,
    handleIncomingMessage,
    handleOutgoingMessage
  ]);

  return (
    <Page>
      <StatusIndicator connected={isConnected}>
        {error
          ? error
          : isConnected
          ? "Connected to socket server"
          : "Disconnected from socket server"}
      </StatusIndicator>
      {messageLog
        .sort((a, b) => {
          // First sort by timestamp (newest first)
          const timeDiff = new Date(b.timestamp) - new Date(a.timestamp);
          if (timeDiff !== 0) return timeDiff;
          // If same timestamp, sent messages come first
          if (a.type === "sent" && b.type === "received") return -1;
          if (a.type === "received" && b.type === "sent") return 1;
          return 0;
        })
        .map((message, index) => (
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
