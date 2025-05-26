import React, { useState, useEffect, useRef, useCallback, lazy } from "react";
import { SerialDataProvider, useSerial } from "./functions/SerialDataContext";
import { ThemeProvider, useTheme } from "./functions/ThemeContext";
import { SocketProvider, useSocket } from "./functions/SocketContext";
import { HandDetectionProvider } from "./functions/HandDetectionContext";
import ReadSerialData from "./functions/ReadSerialData";
import Menu from "./components/UI/Menu";
import Loading from "./components/UI/Loading";
import Hardware from "./components/Simulator/Hardware";
import styled, {
  StyleSheetManager,
  ThemeProvider as StyledThemeProvider
} from "styled-components";
import isPropValid from "@emotion/is-prop-valid";
import menu from "./config/Menu.json";
import hardware from "./config/Hardware.json";

// Import screens and apps dynamically
const screens = {
  LEDController: lazy(() => import("./components/UI/Screens/LEDController")),
  PhysicalInputMonitor: lazy(() =>
    import("./components/UI/Screens/PhysicalInputMonitor")
  ),
  SocketEventsViewer: lazy(() =>
    import("./components/UI/Screens/SocketEventsViewer")
  ),
  CameraHandDetection: lazy(() =>
    import("./components/UI/Screens/CameraHandDetection")
  ),
  About: lazy(() => import("./components/UI/Screens/About"))
};

const apps = {
  AppTemplate: lazy(() => import("./components/Apps/AppTemplate")),
  CircleVisualizer: lazy(() => import("./components/Apps/CircleVisualizer")),
  PopulationMap: lazy(() => import("./components/Apps/PopulationMap")),
  WaveVisualizer: lazy(() => import("./components/Apps/WaveVisualizer")),
  RainMachine: lazy(() => import("./components/Apps/RainMachine")),
  CellMachine: lazy(() => import("./components/Apps/CellMachine")),
  BlobMachine: lazy(() => import("./components/Apps/BlobMachine")),
  HandDetection: lazy(() => import("./components/Apps/HandDetection"))
};

const AppContainer = styled.div.attrs((props) => ({
  style: {
    background: props.theme.background
  }
}))`
  width: ${hardware.screen.width}px;
  height: ${hardware.screen.height}px;
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
  const { serialData, isInputConnected, isOutputConnected, setSerialData } =
    useSerial();
  const {
    connect: connectSocket,
    registerHandler,
    sendMessage,
    setCurrentAppRef
  } = useSocket();
  const [currentScreen, setCurrentScreen] = useState(null);
  const [currentApp, setCurrentApp] = useState(null);
  const [menuStack, setMenuStack] = useState([menu.root]);
  const [previousMenuStack, setPreviousMenuStack] = useState([menu.root]);
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
      if (currentApp) {
        sendMessage({
          action: "appChanged",
          data: { appId: null },
          isFromSelf: true,
          broadcast: true
        });
      }
      setCurrentScreen(null);
      setCurrentApp(null);
      if (submenu) {
        setMenuStack([menu.root, submenu]);
      } else {
        setMenuStack(previousMenuStack);
      }
    },
    [previousMenuStack, currentApp, sendMessage]
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
      // Update currentAppRef in the socket connection
      setCurrentAppRef(appId);
      // Emit socket event when app changes
      sendMessage({
        action: "appChanged",
        data: { appId }
      });
    },
    [menuStack, sendMessage, setCurrentAppRef]
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

  // Initialize socket connection and handle messages
  useEffect(() => {
    connectSocket();

    // Handle incoming socket messages
    const handleMessage = (data) => {
      // Handle setSerialData events
      if (data.action === "setSerialData") {
        const serialDataValues = data.data.data;
        setSerialData(serialDataValues.serialData || serialDataValues);
      }
      // Handle serialData events (from getSerialData response)
      if (data.action === "serialData") {
        const serialDataValues = data.data.serialData;
        setSerialData(serialDataValues);
      }
      // Handle getSerialData requests
      if (data.action === "getSerialData") {
        // Just acknowledge the request, the SocketConnection will handle sending the data
        sendMessage({
          action: "getSerialData"
        });
      }
    };

    // Register handler and get cleanup function
    const cleanup = registerHandler(handleMessage);
    return () => {
      cleanup();
    };
  }, [connectSocket, registerHandler, setSerialData, sendMessage]);

  const renderContent = () => {
    if (currentApp) {
      const AppComponent = apps[currentApp];
      if (!AppComponent) {
        console.error(`App component not found: ${currentApp}`);
        return null;
      }

      // Wrap app components that need hand detection
      const needsHandDetection = ["HandDetection"].includes(currentApp);

      const content = (
        <React.Suspense fallback={<Loading />}>
          <AppComponent onBack={handleBack} />
        </React.Suspense>
      );

      return needsHandDetection ? (
        <HandDetectionProvider>{content}</HandDetectionProvider>
      ) : (
        content
      );
    }

    if (currentScreen) {
      const ScreenComponent = screens[currentScreen];
      if (!ScreenComponent) {
        console.error(`Screen component not found: ${currentScreen}`);
        return null;
      }

      // Wrap screen components that need hand detection
      const needsHandDetection = ["CameraHandDetection"].includes(
        currentScreen
      );

      const content = (
        <React.Suspense fallback={<Loading />}>
          <ScreenComponent onBack={handleBack} />
        </React.Suspense>
      );

      return needsHandDetection ? (
        <HandDetectionProvider>{content}</HandDetectionProvider>
      ) : (
        content
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
        <ScreenContainer id="screen-container" $onDevice={!isSimulatorMode}>
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
          <SocketProvider>
            <ThemeWrapper>
              <AppContent isSimulatorMode={isSimulatorMode} />
            </ThemeWrapper>
          </SocketProvider>
        </SerialDataProvider>
      </ThemeProvider>
    </StyleSheetManager>
  );
}

export default App;
