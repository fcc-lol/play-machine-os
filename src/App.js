import React, { useState, useEffect, useRef, useCallback, lazy } from "react";
import { SerialDataProvider, useSerial } from "./functions/SerialDataContext";
import { ThemeProvider, useTheme } from "./functions/ThemeContext";
import ReadSerialData from "./functions/ReadSerialData";
import Menu from "./components/UI/Menu";
import Hardware from "./components/Simulator/Hardware";
import styled, {
  StyleSheetManager,
  ThemeProvider as StyledThemeProvider
} from "styled-components";
import isPropValid from "@emotion/is-prop-valid";
import menuConfig from "./config/Menu.json";

// Import screens and apps dynamically
const screens = {
  LEDController: lazy(() => import("./components/UI/Screens/LEDController")),
  PhysicalInputMonitor: lazy(() =>
    import("./components/UI/Screens/PhysicalInputMonitor")
  ),
  About: lazy(() => import("./components/UI/Screens/About"))
};

const apps = {
  CircleVisualizer: lazy(() => import("./components/Apps/CircleVisualizer")),
  PopulationMap: lazy(() => import("./components/Apps/PopulationMap")),
  App3: lazy(() => import("./components/Apps/App3"))
};

const AppContainer = styled.div.attrs((props) => ({
  style: {
    background: props.theme.background
  }
}))`
  width: 1024px;
  height: 600px;
  margin: 0;
  position: absolute;
  overflow: hidden;
`;

const ScreenContainer = styled.div.attrs((props) => ({
  style: {
    color: props.theme.text,
    fontFamily: props.theme.fontFamily
  }
}))`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: ${(props) => (props.$onDevice ? "none" : "default")};
  user-select: none;

  * {
    cursor: ${(props) => (props.$onDevice ? "none" : "default")};
    user-select: none;
  }
`;

const DEBOUNCE_TIME = 200; // milliseconds

const AppContent = ({ isSimulatorMode }) => {
  const { serialData, isInputConnected, isOutputConnected } = useSerial();
  const [currentScreen, setCurrentScreen] = useState(null);
  const [currentApp, setCurrentApp] = useState(null);
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
      setCurrentApp(null);
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
      setCurrentApp(null);
    },
    [menuStack]
  );

  const handleAppSelect = useCallback(
    (appId) => {
      setPreviousMenuStack([...menuStack]);
      setCurrentApp(appId);
      setCurrentScreen(null);
    },
    [menuStack]
  );

  useEffect(() => {
    const processButton = (buttonId, action) => {
      if (isButtonDebounced(buttonId)) return;

      if (currentScreen !== null || currentApp !== null) {
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
  }, [serialData, currentScreen, currentApp, handleBack]);

  const handleMenuActionProcessed = useCallback(() => {
    setMenuAction(null);
  }, []);

  const renderContent = () => {
    if (currentApp) {
      const AppComponent = apps[currentApp];
      if (!AppComponent) {
        console.error(`App component not found: ${currentApp}`);
        return null;
      }

      return (
        <React.Suspense fallback={<div>Loading...</div>}>
          <AppComponent onBack={handleBack} />
        </React.Suspense>
      );
    }

    if (currentScreen) {
      const ScreenComponent = screens[currentScreen];
      if (!ScreenComponent) {
        console.error(`Screen component not found: ${currentScreen}`);
        return null;
      }

      return (
        <React.Suspense fallback={<div>Loading...</div>}>
          <ScreenComponent onBack={handleBack} />
        </React.Suspense>
      );
    }

    return (
      <Menu
        onScreenSelect={handleScreenSelect}
        onAppSelect={handleAppSelect}
        menuStack={menuStack}
        setMenuStack={setMenuStack}
        menuAction={menuAction}
        onMenuActionProcessed={handleMenuActionProcessed}
        selectedIndices={selectedIndices}
        setSelectedIndices={setSelectedIndices}
      />
    );
  };

  // Render the actual UI structure
  return (
    <>
      <AppContainer>
        <ScreenContainer $onDevice={!isSimulatorMode}>
          <ReadSerialData />
          {isInputConnected && isOutputConnected && renderContent()}
        </ScreenContainer>
      </AppContainer>
      <Hardware />
    </>
  );
};

// Theme wrapper component to handle theme provider setup
function ThemeWrapper({ children }) {
  const { themeValues } = useTheme();
  return (
    <StyledThemeProvider theme={themeValues}>{children}</StyledThemeProvider>
  );
}

// App component now sets up both providers
function App() {
  const [isSimulatorMode, setIsSimulatorMode] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const onDevice = urlParams.get("onDevice");
    setIsSimulatorMode(onDevice === "false");
  }, []);

  return (
    <StyleSheetManager shouldForwardProp={isPropValid}>
      <ThemeProvider>
        <SerialDataProvider isSimulatorMode={isSimulatorMode}>
          <ThemeWrapper>
            <AppContent isSimulatorMode={isSimulatorMode} />
          </ThemeWrapper>
        </SerialDataProvider>
      </ThemeProvider>
    </StyleSheetManager>
  );
}

export default App;
