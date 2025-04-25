import React, { createContext, useContext, useState, useEffect } from "react";
import themes from "../config/Themes.json";

const ThemeContext = createContext();

export const ThemeProvider = ({ children, theme = Object.keys(themes)[0] }) => {
  const [currentTheme, setCurrentTheme] = useState(() => {
    // Initialize from localStorage on mount
    return localStorage.getItem("theme") || theme;
  });
  const [themeValues, setThemeValues] = useState(() => {
    // Initialize theme values based on stored theme
    const storedTheme = localStorage.getItem("theme") || theme;
    return themes[storedTheme];
  });

  useEffect(() => {
    // Update theme values whenever currentTheme changes
    setThemeValues(themes[currentTheme]);
  }, [currentTheme]);

  const changeTheme = (themeName, saveToStorage = false) => {
    if (!themes[themeName]) {
      console.warn(
        `Theme "${themeName}" not found. Available themes: ${Object.keys(
          themes
        ).join(", ")}`
      );
      return;
    }
    setCurrentTheme(themeName);
    if (saveToStorage) {
      localStorage.setItem("theme", themeName);
    }
  };

  return (
    <ThemeContext.Provider value={{ currentTheme, themeValues, changeTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
