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
  const [environment, setEnvironment] = useState(getEnvironmentFromUrl());

  // Watch for environment changes
  useEffect(() => {
    const checkEnvironment = () => {
      const newEnv = getEnvironmentFromUrl();
      if (newEnv !== environment) {
        setEnvironment(newEnv);
      }
    };

    // Check immediately
    checkEnvironment();

    // Set up a listener for URL changes
    const handleUrlChange = () => {
      checkEnvironment();
    };

    // Listen for popstate events (back/forward navigation)
    window.addEventListener("popstate", handleUrlChange);

    // Also check periodically for URL changes (in case of programmatic changes)
    const interval = setInterval(checkEnvironment, 1000);

    return () => {
      window.removeEventListener("popstate", handleUrlChange);
      clearInterval(interval);
    };
  }, [environment]);

  // Fetch themes from API
  useEffect(() => {
    const fetchThemes = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`${API_URL[environment]}/themes`);

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
  }, [theme, environment]);

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
