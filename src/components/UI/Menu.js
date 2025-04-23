import React, { useEffect, useCallback, useMemo } from "react";
import styled from "styled-components";
import { ThemeSettings } from "./Menus/ThemeSettings";

const Root = styled.div`
  color: ${(props) => props.theme.menuText};
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background: ${(props) => props.theme.menuBackground};
`;

const MenuTitle = styled.div`
  padding: 1rem 4rem;
  margin: 0;
  color: ${(props) => props.theme.menuText};
  font-size: 1.2rem;
  font-family: ${(props) => props.theme.fontFamily};
  font-weight: bold;
  border-bottom: 1px solid ${(props) => props.theme.border};
  text-transform: ${(props) => props.theme.textTransform};
`;

const MenuItem = styled.div`
  padding: 1rem 4rem;
  margin: 0;
  background-color: ${(props) =>
    props.selected
      ? props.theme.menuSelectedBackground
      : props.theme.menuBackground};
  color: ${(props) =>
    props.selected ? props.theme.menuSelectedText : props.theme.menuText};
  cursor: pointer;
  font-size: 1.5rem;
  font-family: ${(props) => props.theme.fontFamily};
  font-weight: bold;
  flex: none;
  text-transform: ${(props) => props.theme.textTransform};
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

  const { handleThemeSelection, previewTheme } = ThemeSettings({
    currentMenu,
    currentMenuItems,
    setSelectedIndices,
    onThemeSelect: (selectedItem) => {
      if (selectedItem.back) {
        const newStack = menuStack.slice(0, -1);
        setMenuStack(newStack);
      }
    }
  });

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
    const newIndex = (getCurrentSelectedIndex() + 1) % currentMenuItems.length;
    setCurrentSelectedIndex(newIndex);

    // Preview theme if we're in the theme menu
    const selectedItem = currentMenuItems[newIndex];
    if (currentMenu.title === "Theme Settings") {
      previewTheme(selectedItem);
    }
  }, [
    currentMenuItems,
    currentMenu.title,
    getCurrentSelectedIndex,
    setCurrentSelectedIndex,
    previewTheme
  ]);

  const handleButtonUp = useCallback(() => {
    const newIndex =
      (getCurrentSelectedIndex() - 1 + currentMenuItems.length) %
      currentMenuItems.length;
    setCurrentSelectedIndex(newIndex);

    // Preview theme if we're in the theme menu
    const selectedItem = currentMenuItems[newIndex];
    if (currentMenu.title === "Theme Settings") {
      previewTheme(selectedItem);
    }
  }, [
    currentMenuItems,
    currentMenu.title,
    getCurrentSelectedIndex,
    setCurrentSelectedIndex,
    previewTheme
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
    } else if (currentMenu.title === "Theme Settings") {
      handleThemeSelection(selectedItem);
    }
  }, [
    currentMenuItems,
    menuStack,
    onScreenSelect,
    setMenuStack,
    getCurrentSelectedIndex,
    setSelectedIndices,
    handleThemeSelection,
    currentMenu.title
  ]);

  const handleButtonB = useCallback(() => {
    if (menuStack.length > 1) {
      const newStack = menuStack.slice(0, -1);
      setMenuStack(newStack);
    }
  }, [menuStack, setMenuStack]);

  useEffect(() => {
    if (!menuAction) return;

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
