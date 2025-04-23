import React, { useEffect, useCallback, useMemo } from "react";
import styled from "styled-components";

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

const Menu = ({
  onScreenSelect,
  menuStack,
  setMenuStack,
  menuAction,
  onMenuActionProcessed,
  selectedIndices,
  setSelectedIndices
}) => {
  const currentMenu = menuStack[menuStack.length - 1];
  const currentMenuItems = currentMenu.items;

  const getCurrentSelectedIndex = useCallback(() => {
    return selectedIndices[currentMenu.title] || 0;
  }, [selectedIndices, currentMenu.title]);

  const setCurrentSelectedIndex = useCallback(
    (index) => {
      setSelectedIndices((prev) => ({
        ...prev,
        [currentMenu.title]: index
      }));
    },
    [currentMenu.title, setSelectedIndices]
  );

  const handleButtonDown = useCallback(() => {
    setCurrentSelectedIndex(
      (getCurrentSelectedIndex() + 1) % currentMenuItems.length
    );
  }, [
    currentMenuItems.length,
    getCurrentSelectedIndex,
    setCurrentSelectedIndex
  ]);

  const handleButtonUp = useCallback(() => {
    setCurrentSelectedIndex(
      (getCurrentSelectedIndex() - 1 + currentMenuItems.length) %
        currentMenuItems.length
    );
  }, [
    currentMenuItems.length,
    getCurrentSelectedIndex,
    setCurrentSelectedIndex
  ]);

  const handleButtonA = useCallback(() => {
    const selectedItem = currentMenuItems[getCurrentSelectedIndex()];
    if (selectedItem.screen) {
      onScreenSelect(selectedItem.screen);
    } else if (selectedItem.submenu) {
      setSelectedIndices((prev) => ({
        ...prev,
        [selectedItem.submenu.title]: 0
      }));
      setMenuStack([...menuStack, selectedItem.submenu]);
    }
  }, [
    currentMenuItems,
    menuStack,
    onScreenSelect,
    setMenuStack,
    getCurrentSelectedIndex,
    setSelectedIndices
  ]);

  const handleButtonB = useCallback(() => {
    if (menuStack.length > 1) {
      const newStack = menuStack.slice(0, -1);
      setMenuStack(newStack);
    }
  }, [menuStack, setMenuStack]);

  useEffect(() => {
    if (!menuAction) return;

    console.log("Menu.js received action:", menuAction);

    switch (menuAction) {
      case "up":
        handleButtonUp();
        break;
      case "down":
        handleButtonDown();
        break;
      case "a":
        handleButtonA();
        break;
      case "b":
        handleButtonB();
        break;
      default:
        break;
    }

    if (onMenuActionProcessed) {
      onMenuActionProcessed();
    }
  }, [
    menuAction,
    onMenuActionProcessed,
    handleButtonUp,
    handleButtonDown,
    handleButtonA,
    handleButtonB
  ]);

  const renderedMenuItems = useMemo(
    () =>
      currentMenuItems.map((item, index) => (
        <MenuItem key={item.id} selected={index === getCurrentSelectedIndex()}>
          {item.label}
        </MenuItem>
      )),
    [currentMenuItems, getCurrentSelectedIndex]
  );

  return (
    <Root>
      <MenuTitle>{currentMenu.title}</MenuTitle>
      {renderedMenuItems}
    </Root>
  );
};

export default Menu;
