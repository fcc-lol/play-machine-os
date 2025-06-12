import { useEffect, useRef } from "react";
import { useTheme } from "../../../functions/ThemeContext";
import { useSocket } from "../../../functions/SocketContext";

export const ThemeSettings = ({
  currentMenu,
  currentMenuItems,
  setSelectedIndices,
  onThemeSelect
}) => {
  const { changeTheme, currentTheme } = useTheme();
  const { sendMessage } = useSocket();
  const hasSetInitialIndex = useRef(false);

  // Set initial selected index for Theme Settings menu based on current theme
  useEffect(() => {
    if (!hasSetInitialIndex.current) {
      // Get theme from local storage
      const storedTheme = localStorage.getItem("theme");
      const themeToUse = storedTheme || currentTheme;

      // Find the index of the current theme in the original menu items (excluding the back item)
      const originalMenuItems = currentMenuItems.filter(
        (item) => item.id !== "back"
      );
      const currentThemeIndex = originalMenuItems.findIndex(
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
    if (selectedItem.id === "back") {
      // Just return true to allow navigation back, no theme changes needed
      return true;
    } else if (selectedItem.id) {
      // Apply the theme permanently and save to localStorage
      changeTheme(selectedItem.id, true);
      // Send socket event for theme change
      sendMessage({
        action: "currentTheme",
        data: { theme: selectedItem.id },
        isFromSelf: true,
        broadcast: true,
        from: "play-machine-os-theme-changed"
      });
      onThemeSelect?.(selectedItem);
      return true;
    }
    return false;
  };

  const previewTheme = (selectedItem) => {
    if (selectedItem.id === "back") {
      // Preview the current theme from localStorage
      const storedTheme = localStorage.getItem("theme") || currentTheme;
      changeTheme(storedTheme, false);
    } else if (selectedItem.id) {
      // Just preview the theme without saving to localStorage
      changeTheme(selectedItem.id, false);
    }
  };

  // Add current theme information to menu items
  const menuItemsWithCurrentTheme = currentMenuItems.map((item) => ({
    ...item,
    isCurrentTheme: item.id === localStorage.getItem("theme")
  }));

  return {
    handleThemeSelection,
    previewTheme,
    menuItemsWithCurrentTheme
  };
};
