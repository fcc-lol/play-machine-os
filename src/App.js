import React, { useState, useEffect, useRef, useCallback, lazy } from "react";
import { SerialDataProvider, useSerial } from "./SerialDataContext";
import { ThemeProvider, useTheme } from "./ThemeContext";
import ReadSerialData from "./ReadSerialData";
import Menu from "./components/UI/Menu";
import Hardware from "./components/Simulator/Hardware";
import styled, {
  StyleSheetManager,
  ThemeProvider as StyledThemeProvider
} from "styled-components";
import isPropValid from "@emotion/is-prop-valid";
import menuConfig from "./config/Menu.json";

// Import all screens dynamically
const screens = {};
const screenFiles = require.context("./components/UI/Screens", false, /\.js$/);

screenFiles.keys().forEach((fileName) => {
  // Skip index.js if it exists
  if (fileName === "./index.js") return;

  // Get the component name from the file name (remove .js extension)
  const componentName = fileName.replace(/^\.\/(.*)\.js$/, "$1");

  // Add to screens object with lazy loading
  screens[componentName] = lazy(() =>
    import(`./components/UI/Screens/${componentName}`)
  );
});

const AppContainer = styled.div`
  background: ${(props) => props.theme.background};
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
  color: ${(props) => props.theme.text};
  font-family: ${(props) => props.theme.fontFamily};
`;

const DEBOUNCE_TIME = 200; // milliseconds

// Move all logic into an inner component
function AppContent() {
  const { serialData } = useSerial();
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
    if (!currentScreen) {
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

// Theme wrapper component to handle theme provider setup
function ThemeWrapper({ children }) {
  const { themeValues } = useTheme();
  return (
    <StyledThemeProvider theme={themeValues}>{children}</StyledThemeProvider>
  );
}

// App component now sets up both providers
function App() {
  return (
    <StyleSheetManager shouldForwardProp={isPropValid}>
      <ThemeProvider>
        <SerialDataProvider>
          <ThemeWrapper>
            <AppContent />
          </ThemeWrapper>
        </SerialDataProvider>
      </ThemeProvider>
    </StyleSheetManager>
  );
}

export default App;
