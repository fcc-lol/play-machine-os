import React from "react";
import { SerialDataProvider } from "./SerialDataContext";
import ReadSerialData from "./ReadSerialData";
import Menu from "./components/Menu";
import Simulator from "./components/Simulator";
import styled from "styled-components";

const AppContainer = styled.div`
  background: #000000;
  width: 1024px;
  height: 600px;
  margin: 0;
  position: absolute;
  overflow: hidden;
  cursor: none;
  user-select: none;

  * {
    cursor: none;
    user-select: none;
  }
`;

function App() {
  return (
    <SerialDataProvider>
      <AppContainer>
        <ReadSerialData />
        <Menu />
      </AppContainer>
      <Simulator />
    </SerialDataProvider>
  );
}

export default App;
