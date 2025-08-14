import React, { useState, useEffect, useRef, useCallback, lazy } from "react";
import { SerialDataProvider, useSerial } from "./functions/SerialDataContext";
import { ThemeProvider, useTheme } from "./functions/ThemeContext";
import { SocketProvider, useSocket } from "./functions/SocketContext";
import { HandDetectionProvider } from "./functions/HandDetectionContext";
import ReadSerialData from "./functions/ReadSerialData";
import Menu from "./components/UI/Menu";
import Loading from "./components/UI/Loading";
import Hardware from "./components/Simulator/Hardware";
import Bootloader from "./components/UI/Bootloader";
import styled, {
  StyleSheetManager,
  ThemeProvider as StyledThemeProvider
} from "styled-components";
import isPropValid from "@emotion/is-prop-valid";
import menu from "./config/Menu.json";
import hardware from "./config/Hardware.json";
import { API_URL } from "./config/API";
import { getEnvironmentFromUrl } from "./utils/GetEnvironment";

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
  RemoteViewer: lazy(() => import("./components/UI/Screens/RemoteViewer")),
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
    background: props.theme.background,
    ...(props.$stretchToFill && {
      width: "100vw",
      height: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      position: "fixed",
      top: 0,
      left: 0
    }),
    ...(props.$fullScreen && {
      width: "100vw",
      height: "100vh",
      position: "fixed",
      top: 0,
      left: 0
    })
  }
}))`
  width: ${(props) => {
    if (props.$fullScreen) return "100vw";
    if (props.$stretchToFill) return "auto";
    return `${hardware.screen.width}px`;
  }};
  height: ${(props) => {
    if (props.$fullScreen) return "100vh";
    if (props.$stretchToFill) return "auto";
    return `${hardware.screen.height}px`;
  }};
  margin: 0;
  position: ${(props) =>
    props.$stretchToFill || props.$fullScreen ? "fixed" : "absolute"};
  overflow: hidden;

  ${(props) =>
    props.$stretchToFill &&
    `
    & > div {
      width: ${hardware.screen.width}px;
      height: ${hardware.screen.height}px;
      transform: scale(var(--scale-factor, 1));
      transform-origin: center center;
      position: relative;
      flex-shrink: 0;
      flex-grow: 0;
    }
  `}
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

const BrightnessOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: black;
  opacity: ${(props) => 1 - (props.$brightness || 1)};
  pointer-events: none;
  z-index: 1000;
`;

const DEBOUNCE_TIME = 200; // milliseconds

const MissingAPIKey = styled.div`
  position: relative;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: #000000;
  color: white;
  font-weight: bold;
  font-size: 2rem;
  border: none;
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: system-ui;
`;

const InvalidAPIKey = styled(MissingAPIKey)`
  color: #ff4444;
`;

const AppContent = ({ isSimulatorMode, stretchToFill, fullScreen }) => {
  const {
    serialData,
    isInputConnected,
    isOutputConnected,
    setSerialData,
    multiPlayerMode,
    externalController
  } = useSerial();
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
  const [brightness, setBrightness] = useState(1);
  const lastButtonPressTime = useRef({});

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const brightnessValue = parseFloat(urlParams.get("brightness") || "1");
    setBrightness(Math.min(Math.max(brightnessValue, 0), 1)); // Clamp between 0 and 1
  }, []);

  // Calculate and set scale factor for stretchToFill mode
  useEffect(() => {
    if (stretchToFill) {
      const calculateScale = () => {
        const viewportWidth = window.innerWidth;

        // Calculate scale factor based on width to make it 100% of window width
        const scaleFactor = viewportWidth / hardware.screen.width;

        document.documentElement.style.setProperty(
          "--scale-factor",
          scaleFactor
        );
      };

      calculateScale();
      window.addEventListener("resize", calculateScale);

      return () => {
        window.removeEventListener("resize", calculateScale);
      };
    }
  }, [stretchToFill]);

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
          data: { appId: null }
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
      // Update currentAppRef in the socket connection and notify other clients
      setCurrentAppRef(null);
      sendMessage({
        action: "appChanged",
        data: { appId: null }
      });
    },
    [menuStack, sendMessage, setCurrentAppRef]
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
      // Handle appChanged events to keep currentApp state synchronized
      if (data.action === "appChanged") {
        const { appId } = data.data;
        if (appId === null) {
          setCurrentApp(null);
          setCurrentScreen(null);
          setCurrentAppRef(null);
        } else {
          setCurrentApp(appId);
          setCurrentScreen(null);
          setCurrentAppRef(appId);
        }
      }
    };

    // Register handler and get cleanup function
    const cleanup = registerHandler(handleMessage);
    return () => {
      cleanup();
    };
  }, [
    connectSocket,
    registerHandler,
    setSerialData,
    sendMessage,
    setCurrentAppRef
  ]);

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
        multiPlayerMode={multiPlayerMode}
      />
    );
  };

  // Render the actual UI structure
  return (
    <>
      <AppContainer $stretchToFill={stretchToFill} $fullScreen={fullScreen}>
        <ScreenContainer id="screen-container" $onDevice={!isSimulatorMode}>
          <ReadSerialData />
          {isInputConnected &&
            (isOutputConnected || externalController) &&
            renderContent()}
          <BrightnessOverlay $brightness={brightness} />
        </ScreenContainer>
      </AppContainer>
      {isSimulatorMode && <Hardware />}
    </>
  );
};

// Theme wrapper component to handle theme provider setup
function ThemeWrapper({ children }) {
  const { themeValues } = useTheme();

  // Provide a fallback theme while loading or if themeValues is null
  const fallbackTheme = {
    background: "#000000",
    text: "#00ff00",
    fontFamily: "monospace",
    fontSize: "1rem",
    textTransform: "uppercase",
    menuBackground: "#000000",
    menuText: "#00ff00",
    menuSelectedBackground: "#00ff00",
    menuSelectedText: "#000000",
    border: "#00ff00"
  };

  const themeToUse = themeValues || fallbackTheme;

  return (
    <StyledThemeProvider theme={themeToUse}>{children}</StyledThemeProvider>
  );
}

// App component now sets up both providers
function App() {
  const [isSimulatorMode, setIsSimulatorMode] = useState(false);
  const [multiPlayerMode, setMultiPlayerMode] = useState(false);
  const [stretchToFill, setStretchToFill] = useState(false);
  const [fullScreen, setFullScreen] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(true);
  const [isApiKeyValid, setIsApiKeyValid] = useState(true);
  const [isValidating, setIsValidating] = useState(true);
  const [showBootloader, setShowBootloader] = useState(false);

  useEffect(() => {
    const validateApiKey = async () => {
      const urlParams = new URLSearchParams(window.location.search);

      // Check if any URL parameters are present
      const hasAnyParams = Array.from(urlParams.keys()).length > 0;

      // If no parameters are present, show bootloader
      if (!hasAnyParams) {
        setShowBootloader(true);
        setIsValidating(false);
        return;
      }

      const onDevice = urlParams.get("onDevice");
      const apiKey = urlParams.get("apiKey");
      const multiPlayerModeParam = urlParams.get("multiPlayerMode");
      const stretchToFillParam = urlParams.get("stretchToFill");
      const fullScreenParam = urlParams.get("fullScreen");
      const env = getEnvironmentFromUrl();

      // isSimulatorMode is determined by onDevice parameter (backward compatibility)
      setIsSimulatorMode(onDevice === "false");
      setMultiPlayerMode(multiPlayerModeParam === "true");
      setStretchToFill(stretchToFillParam === "true");
      setFullScreen(fullScreenParam === "true");
      setHasApiKey(!!apiKey);

      if (apiKey) {
        try {
          const validationUrl = `${API_URL[env]}/validate-api-key?apiKey=${apiKey}`;
          const response = await fetch(validationUrl);
          const data = await response.json();
          setIsApiKeyValid(data.valid);
        } catch (error) {
          setIsApiKeyValid(false);
        }
      }
      setIsValidating(false);
    };

    validateApiKey();
  }, []);

  if (showBootloader) {
    return (
      <StyleSheetManager shouldForwardProp={isPropValid}>
        <Bootloader />
      </StyleSheetManager>
    );
  }

  if (isValidating) {
    return (
      <StyleSheetManager shouldForwardProp={isPropValid}>
        <ThemeProvider>
          <SerialDataProvider
            isSimulatorMode={isSimulatorMode}
            multiPlayerMode={multiPlayerMode}
          >
            <SocketProvider>
              <ThemeWrapper>
                <AppContainer
                  $stretchToFill={stretchToFill}
                  $fullScreen={fullScreen}
                >
                  <ScreenContainer
                    id="screen-container"
                    $onDevice={!isSimulatorMode}
                  >
                    <Loading />
                  </ScreenContainer>
                </AppContainer>
                {isSimulatorMode && <Hardware />}
              </ThemeWrapper>
            </SocketProvider>
          </SerialDataProvider>
        </ThemeProvider>
      </StyleSheetManager>
    );
  }

  if (!hasApiKey) {
    return (
      <StyleSheetManager shouldForwardProp={isPropValid}>
        <ThemeProvider>
          <SerialDataProvider
            isSimulatorMode={isSimulatorMode}
            multiPlayerMode={multiPlayerMode}
          >
            <SocketProvider>
              <ThemeWrapper>
                <AppContainer
                  $stretchToFill={stretchToFill}
                  $fullScreen={fullScreen}
                >
                  <ScreenContainer
                    id="screen-container"
                    $onDevice={!isSimulatorMode}
                  >
                    <MissingAPIKey>No API key set</MissingAPIKey>
                  </ScreenContainer>
                </AppContainer>
                {isSimulatorMode && <Hardware />}
              </ThemeWrapper>
            </SocketProvider>
          </SerialDataProvider>
        </ThemeProvider>
      </StyleSheetManager>
    );
  }

  if (!isApiKeyValid) {
    return (
      <StyleSheetManager shouldForwardProp={isPropValid}>
        <ThemeProvider>
          <SerialDataProvider
            isSimulatorMode={isSimulatorMode}
            multiPlayerMode={multiPlayerMode}
          >
            <SocketProvider>
              <ThemeWrapper>
                <AppContainer
                  $stretchToFill={stretchToFill}
                  $fullScreen={fullScreen}
                >
                  <ScreenContainer
                    id="screen-container"
                    $onDevice={!isSimulatorMode}
                  >
                    <InvalidAPIKey>Invalid API key</InvalidAPIKey>
                  </ScreenContainer>
                </AppContainer>
                {isSimulatorMode && <Hardware />}
              </ThemeWrapper>
            </SocketProvider>
          </SerialDataProvider>
        </ThemeProvider>
      </StyleSheetManager>
    );
  }

  return (
    <StyleSheetManager shouldForwardProp={isPropValid}>
      <ThemeProvider>
        <SerialDataProvider
          isSimulatorMode={isSimulatorMode}
          multiPlayerMode={multiPlayerMode}
        >
          <SocketProvider>
            <ThemeWrapper>
              <AppContent
                isSimulatorMode={isSimulatorMode}
                stretchToFill={stretchToFill}
                fullScreen={fullScreen}
              />
            </ThemeWrapper>
          </SocketProvider>
        </SerialDataProvider>
      </ThemeProvider>
    </StyleSheetManager>
  );
}

export default App;
