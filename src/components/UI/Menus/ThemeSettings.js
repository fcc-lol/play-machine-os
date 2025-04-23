import React, { useEffect, useRef } from "react";
import { useTheme } from "../../../ThemeContext";

export const ThemeSettings = ({
  currentMenu,
  currentMenuItems,
  setSelectedIndices,
  onThemeSelect
}) => {
  const { changeTheme, currentTheme } = useTheme();
  const hasSetInitialIndex = useRef(false);

  // Set initial selected index for Theme Settings menu based on current theme
  useEffect(() => {
    if (!hasSetInitialIndex.current) {
      // Get theme from local storage
      const storedTheme = localStorage.getItem("theme");
      const themeToUse = storedTheme || currentTheme;

      const currentThemeIndex = currentMenuItems.findIndex(
        (item) => item.id === themeToUse
      );
      if (currentThemeIndex !== -1) {
        setSelectedIndices((prev) => ({
          ...prev,
          [currentMenu.title]: currentThemeIndex
        }));
        hasSetInitialIndex.current = true;
      }
    }
  }, [currentMenuItems, currentTheme, setSelectedIndices, currentMenu.title]);

  const handleThemeSelection = (selectedItem) => {
    if (selectedItem.id) {
      // Apply the theme permanently and save to localStorage
      changeTheme(selectedItem.id);
      localStorage.setItem("theme", selectedItem.id);
      onThemeSelect?.(selectedItem);
      return true;
    }
    return false;
  };

  const previewTheme = (selectedItem) => {
    if (selectedItem.id) {
      changeTheme(selectedItem.id);
    }
  };

  return {
    handleThemeSelection,
    previewTheme
  };
};
