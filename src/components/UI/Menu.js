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
  font-size: 1.5rem;
  font-family: ${(props) => props.theme.fontFamily};
  font-weight: bold;
  flex: none;
  text-transform: ${(props) => props.theme.textTransform};
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const CurrentThemeIndicator = styled.span`
  font-size: 1rem;
  opacity: 0.7;
  margin-left: 1rem;
`;

const Menu = ({
  onScreenSelect,
  onAppSelect,
  menuStack,
  setMenuStack,
  menuAction,
  onMenuActionProcessed,
  selectedIndices,
  setSelectedIndices
}) => {
  const currentMenu = menuStack[menuStack.length - 1];
  const currentMenuItems = useMemo(() => {
    // Add back menu item to all submenus except the main menu
    if (menuStack.length > 1) {
      return [...currentMenu.items, { id: "back", label: "Back" }];
    }
    return currentMenu.items;
  }, [currentMenu.items, menuStack.length]);

  const { handleThemeSelection, previewTheme, menuItemsWithCurrentTheme } =
    ThemeSettings({
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

  // Set initial selected index when entering a new menu
  useEffect(() => {
    if (currentMenu.title === "Theme Settings") {
      const storedTheme = localStorage.getItem("theme");
      const themeToUse = storedTheme || "hacker"; // Default to hacker if no theme is stored
      const themeIndex = currentMenuItems.findIndex(
        (item) => item.id === themeToUse
      );
      if (themeIndex !== -1) {
        setCurrentSelectedIndex(themeIndex);
      }
    }
  }, [currentMenu.title, currentMenuItems, setCurrentSelectedIndex]);

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
    if (selectedItem.id === "back") {
      const newStack = menuStack.slice(0, -1);
      setMenuStack(newStack);
    } else if (selectedItem.screen) {
      onScreenSelect(selectedItem.screen);
    } else if (selectedItem.app) {
      onAppSelect(selectedItem.app);
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
    onAppSelect,
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
      menuItemsWithCurrentTheme.map((item, index) => (
        <MenuItem key={item.id} selected={index === getCurrentSelectedIndex()}>
          {item.id === "back" ? "← Back" : item.label}
          {item.isCurrentTheme && (
            <CurrentThemeIndicator>Current</CurrentThemeIndicator>
          )}
        </MenuItem>
      )),
    [menuItemsWithCurrentTheme, getCurrentSelectedIndex]
  );

  return (
    <Root>
      <MenuTitle>{currentMenu.title}</MenuTitle>
      {renderedMenuItems}
    </Root>
  );
};

export default Menu;
