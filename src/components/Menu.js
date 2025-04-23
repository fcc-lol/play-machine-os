import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef
} from "react";
import { useSerial } from "../SerialDataContext";
import styled from "styled-components";
import { menuConfig } from "../config/menuConfig";

const Root = styled.div`
  color: #ffffff;
  display: flex;
  flex-direction: column;
`;

const MenuTitle = styled.div`
  padding: 1rem 4rem;
  margin: 0;
  color: rgba(0, 255, 0, 1);
  font-size: 1.2rem;
  font-family: "Courier New", Courier, monospace;
  font-weight: bold;
  border-bottom: 1px solid rgba(0, 255, 0, 0.3);
`;

const MenuItem = styled.div`
  padding: 1rem 4rem;
  margin: 0;
  background-color: ${(props) =>
    props.selected ? "rgba(0, 255, 0, 1)" : "#000"};
  color: ${(props) => (props.selected ? "#000" : "rgba(0, 255, 0, 1)")};
  cursor: pointer;
  font-size: 1.5rem;
  font-family: "Courier New", Courier, monospace;
  font-weight: bold;
  flex: none;
`;

const Menu = () => {
  const { serialData, isConnected } = useSerial();
  const [menuStack, setMenuStack] = useState([menuConfig.root]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const lastButtonPressTime = useRef({});

  const currentMenu = menuStack[menuStack.length - 1];
  const currentMenuItems = currentMenu.items;

  const DEBOUNCE_TIME = 200; // milliseconds

  const isButtonDebounced = (buttonId) => {
    const now = Date.now();
    const lastPress = lastButtonPressTime.current[buttonId] || 0;
    if (now - lastPress < DEBOUNCE_TIME) {
      return true;
    }
    lastButtonPressTime.current[buttonId] = now;
    return false;
  };

  const handleButtonDown = useCallback(() => {
    if (isButtonDebounced("down")) return;
    setSelectedIndex((prevIndex) => (prevIndex + 1) % currentMenuItems.length);
  }, [currentMenuItems.length]);

  const handleButtonUp = useCallback(() => {
    if (isButtonDebounced("up")) return;
    setSelectedIndex(
      (prevIndex) =>
        (prevIndex - 1 + currentMenuItems.length) % currentMenuItems.length
    );
  }, [currentMenuItems.length]);

  const handleButtonA = useCallback(() => {
    if (isButtonDebounced("a")) return;
    const selectedItem = currentMenuItems[selectedIndex];
    if (selectedItem.submenu) {
      setMenuStack([...menuStack, selectedItem.submenu]);
      setSelectedIndex(0);
    }
  }, [currentMenuItems, selectedIndex, menuStack]);

  const handleButtonB = useCallback(() => {
    if (isButtonDebounced("b")) return;
    if (menuStack.length > 1) {
      setMenuStack(menuStack.slice(0, -1));
      setSelectedIndex(0);
    }
  }, [menuStack]);

  useEffect(() => {
    if (serialData.button_down && serialData.button_down.value === true) {
      handleButtonDown();
    }

    if (serialData.button_up && serialData.button_up.value === true) {
      handleButtonUp();
    }

    if (serialData.button_a && serialData.button_a.value === true) {
      handleButtonA();
    }

    if (serialData.button_b && serialData.button_b.value === true) {
      handleButtonB();
    }
  }, [
    serialData,
    handleButtonDown,
    handleButtonUp,
    handleButtonA,
    handleButtonB
  ]);

  const renderedMenuItems = useMemo(
    () =>
      currentMenuItems.map((item, index) => (
        <MenuItem key={item.id} selected={index === selectedIndex}>
          {item.label}
        </MenuItem>
      )),
    [currentMenuItems, selectedIndex]
  );

  if (!isConnected) return null;

  return (
    <Root>
      <MenuTitle>{currentMenu.title}</MenuTitle>
      {renderedMenuItems}
    </Root>
  );
};

export default Menu;
