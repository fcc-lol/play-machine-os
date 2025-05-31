import React, { createContext, useContext, useState, useEffect } from "react";
import { API_URL } from "../config/API";
import { getEnvironmentFromUrl } from "../utils/GetEnvironment";

const ThemeContext = createContext();

export const ThemeProvider = ({ children, theme = "hacker" }) => {
  const [themes, setThemes] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentTheme, setCurrentTheme] = useState(() => {
    // Initialize from localStorage on mount
    return localStorage.getItem("theme") || theme;
  });
  const [themeValues, setThemeValues] = useState(null);

  // Fetch themes from API
  useEffect(() => {
    const fetchThemes = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const env = getEnvironmentFromUrl();
        const response = await fetch(`${API_URL[env]}/themes`);

        if (!response.ok) {
          throw new Error(`Failed to fetch themes: ${response.status}`);
        }

        const themesData = await response.json();
        setThemes(themesData);

        // Set initial theme values based on current theme
        const storedTheme = localStorage.getItem("theme") || theme;
        const themeToUse = themesData[storedTheme]
          ? storedTheme
          : Object.keys(themesData)[0];
        setCurrentTheme(themeToUse);
        setThemeValues(themesData[themeToUse]);
      } catch (err) {
        console.error("Error fetching themes:", err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchThemes();
  }, [theme]);

  useEffect(() => {
    // Update theme values whenever currentTheme changes and themes are loaded
    if (themes[currentTheme]) {
      setThemeValues(themes[currentTheme]);
    }
  }, [currentTheme, themes]);

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
    <ThemeContext.Provider
      value={{
        currentTheme,
        themeValues,
        changeTheme,
        themes,
        isLoading,
        error
      }}
    >
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
