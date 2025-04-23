import React, { useState, useEffect, useRef, useCallback } from "react";
import { SerialDataProvider, useSerial } from "./SerialDataContext";
import ReadSerialData from "./ReadSerialData";
import Menu from "./components/UI/Menu";
import Hardware from "./components/Simulator/Hardware";
import Version from "./components/Screens/Version";
import Credits from "./components/Screens/Credits";
import styled, { StyleSheetManager } from "styled-components";
import isPropValid from "@emotion/is-prop-valid";
import menuConfig from "./config/Menu.json";

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

const ScreenContainer = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: rgba(0, 255, 0, 1);
  font-family: "Courier New", Courier, monospace;
`;

const DEBOUNCE_TIME = 200; // milliseconds

// Move all logic into an inner component
function AppContent() {
  const { serialData } = useSerial(); // useSerial is now called within the provider's context
  const [currentScreen, setCurrentScreen] = useState(null);
  const [menuStack, setMenuStack] = useState([menuConfig.root]);
  const [previousMenuStack, setPreviousMenuStack] = useState([menuConfig.root]);
  const [menuAction, setMenuAction] = useState(null);
  const [selectedIndices, setSelectedIndices] = useState({});
  const lastButtonPressTime = useRef({});

  const isButtonDebounced = (buttonId) => {
    const now = Date.now();
    const lastPress = lastButtonPressTime.current[buttonId] || 0;
    if (now - lastPress < DEBOUNCE_TIME) {
      return true;
    }
    lastButtonPressTime.current[buttonId] = now;
    return false;
  };

  const handleBack = useCallback(
    (submenu) => {
      setCurrentScreen(null);
      if (submenu) {
        setMenuStack([menuConfig.root, submenu]);
      } else {
        setMenuStack(previousMenuStack);
      }
    },
    [previousMenuStack]
  );

  const handleScreenSelect = useCallback(
    (screen) => {
      setPreviousMenuStack([...menuStack]);
      setCurrentScreen(screen);
    },
    [menuStack]
  );

  useEffect(() => {
    const processButton = (buttonId, action) => {
      if (isButtonDebounced(buttonId)) return;

      if (currentScreen !== null) {
        if (action === "b") {
          handleBack();
        }
      } else {
        setMenuAction(action);
      }
    };

    if (serialData.button_down?.value === true) processButton("down", "down");
    if (serialData.button_up?.value === true) processButton("up", "up");
    if (serialData.button_a?.value === true) processButton("a", "a");
    if (serialData.button_b?.value === true) processButton("b", "b");
  }, [serialData, currentScreen, handleBack]);

  const handleMenuActionProcessed = useCallback(() => {
    setMenuAction(null);
  }, []);

  const renderScreen = () => {
    switch (currentScreen) {
      case "Version":
        return <Version onBack={handleBack} />;
      case "Credits":
        return <Credits onBack={handleBack} />;
      default:
        return (
          <Menu
            onScreenSelect={handleScreenSelect}
            menuStack={menuStack}
            setMenuStack={setMenuStack}
            menuAction={menuAction}
            onMenuActionProcessed={handleMenuActionProcessed}
            selectedIndices={selectedIndices}
            setSelectedIndices={setSelectedIndices}
          />
        );
    }
  };

  // Render the actual UI structure
  return (
    <>
      <AppContainer>
        <ReadSerialData />
        <ScreenContainer>{renderScreen()}</ScreenContainer>
      </AppContainer>
      <Hardware />
    </>
  );
}

// App component now just sets up the provider
function App() {
  return (
    <StyleSheetManager shouldForwardProp={isPropValid}>
      <SerialDataProvider>
        <AppContent />
      </SerialDataProvider>
    </StyleSheetManager>
  );
}

export default App;
