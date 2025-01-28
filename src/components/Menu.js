import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSerial } from "../SerialDataContext";
import styled from "styled-components";

const Root = styled.div`
  color: #ffffff;
  display: flex;
  flex-direction: column;
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

const menuOptions = ["APPS", "SETTINGS", "ABOUT", "EXIT"];

const Menu = () => {
  const { serialData, isConnected } = useSerial();
  const [selectedIndex, setSelectedIndex] = useState(0);

  const handleButtonDown = useCallback(() => {
    setSelectedIndex((prevIndex) => (prevIndex + 1) % menuOptions.length);
  }, []);

  const handleButtonUp = useCallback(() => {
    setSelectedIndex(
      (prevIndex) => (prevIndex - 1 + menuOptions.length) % menuOptions.length
    );
  }, []);

  useEffect(() => {
    if (serialData.button_down && serialData.button_down.value === true) {
      handleButtonDown();
    }

    if (serialData.button_up && serialData.button_up.value === true) {
      handleButtonUp();
    }
  }, [serialData, handleButtonDown, handleButtonUp]);

  const menuItems = useMemo(
    () =>
      menuOptions.map((option, index) => (
        <MenuItem key={index} selected={index === selectedIndex}>
          {option}
        </MenuItem>
      )),
    [selectedIndex]
  );

  if (!isConnected) return null;

  return <Root>{menuItems}</Root>;
};

export default Menu;
