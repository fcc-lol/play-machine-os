import React, { createContext, useContext, useState, useEffect } from "react";

const ThemeContext = createContext();

const themes = {
  hacker: {
    background: "#000000",
    text: "rgba(0, 255, 0, 1)",
    accent: "rgba(0, 255, 0, 1)",
    menuBackground: "#000000",
    menuText: "rgba(0, 255, 0, 1)",
    menuSelectedBackground: "rgba(0, 255, 0, 1)",
    menuSelectedText: "#000000",
    border: "rgba(0, 255, 0, 0.3)",
    fontFamily: "monospace",
    textTransform: "uppercase"
  },
  monochrome: {
    background: "#ffffff",
    text: "#000000",
    accent: "#000000",
    menuBackground: "#ffffff",
    menuText: "#000000",
    menuSelectedBackground: "#000000",
    menuSelectedText: "#ffffff",
    border: "rgba(0, 0, 0, 0.3)",
    fontFamily: "system-ui",
    textTransform: "none"
  },
  sunset: {
    background: "#FFF1E6",
    text: "#7D4E57",
    accent: "#FF7F50",
    menuBackground: "#FFE4E1",
    menuText: "#7D4E57",
    menuSelectedBackground: "#FF7F50",
    menuSelectedText: "#FFF1E6",
    border: "rgba(125, 78, 87, 0.3)",
    fontFamily: "Georgia, serif",
    textTransform: "none"
  }
};

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

  const changeTheme = (themeName) => {
    if (!themes[themeName]) {
      console.warn(
        `Theme "${themeName}" not found. Available themes: ${Object.keys(
          themes
        ).join(", ")}`
      );
      return;
    }
    setCurrentTheme(themeName);
    localStorage.setItem("theme", themeName);
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
