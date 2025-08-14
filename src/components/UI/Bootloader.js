import React, { useState, useEffect } from "react";
import styled from "styled-components";

const BootloaderContainer = styled.div`
  color: #ffffff;
  font-family: monospace;
  font-size: 1rem;
  padding: 1.25rem;
  padding-bottom: 8rem;
  overflow-y: auto;
  box-sizing: border-box;
  position: absolute;
  min-height: 100vh;
  left: 50%;
  transform: translateX(-50%);
  width: 48rem;

  ::selection {
    background-color: rgba(255, 255, 255, 1);
    color: #000000;
  }
`;

const Title = styled.h1`
  color: #ffffff;
  margin-bottom: 4rem;
  text-align: center;
  font-size: 2rem;
  text-transform: uppercase;
`;

const ParameterSectionsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding-bottom: 5rem;
`;

const ParameterSection = styled.div`
  display: flex;
  align-items: center;
  gap: 2rem;
  padding-bottom: 1.5rem;
  border-bottom: 2px solid rgba(255, 255, 255, 0.05);

  &:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }
`;

const ParameterInfo = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  gap: 0.25rem;
`;

const ParameterControl = styled.div`
  flex: 0 0 12.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const ParameterLabel = styled.label`
  display: block;
  margin-bottom: 0.25rem;
  font-weight: bold;
  color: #ffffff;
`;

const ParameterDescription = styled.div`
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.5);
`;

const Input = styled.input`
  width: 100%;
  padding: 0.5rem;
  background-color: rgba(255, 255, 255, 0.05);
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.25rem;
  font-family: inherit;
  font-size: 1rem;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: rgba(255, 255, 255, 0.5);
  }
`;

const Select = styled.select`
  width: 100%;
  padding: 0.5rem;
  background-color: rgba(255, 255, 255, 0.05);
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.5rem;
  font-family: inherit;
  font-size: 1rem;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: rgba(255, 255, 255, 0.5);
  }
`;

const RangeInput = styled.input`
  width: 100%;
  padding: 0.5rem 0;
  background-color: transparent;
  border: none;
  border-radius: 0;
  font-family: inherit;
  font-size: 1rem;
  box-sizing: border-box;

  &:focus {
    outline: none;
  }
`;

const FixedButtonContainer = styled.div`
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 48rem;
  padding: 6rem 1.25rem 1.25rem 1.25rem;
  background: linear-gradient(to bottom, transparent, #191919 40%);
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
  box-sizing: border-box;
  pointer-events: none;
`;

const BootButton = styled.button`
  width: 100%;
  padding: 1rem;
  background-color: #ffffff;
  color: #000000;
  border: none;
  border-radius: 0.5rem;
  font-size: 1.25rem;
  font-weight: bold;
  cursor: pointer;
  pointer-events: auto;
  transition: all 0.1s ease-in-out;
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;

  &:hover {
    background-color: rgba(255, 255, 255, 0.8);
  }

  &:active {
    background-color: rgba(255, 255, 255, 0.8);
    transform: scale(0.95);
  }
`;

const ResetButton = styled.button`
  width: 100%;
  padding: 0.625rem;
  background-color: transparent;
  color: #ffffff;
  border: none;
  border-radius: 0.5rem;
  font-size: 1rem;
  cursor: pointer;
  background-color: rgba(0, 0, 0, 0.25);
  pointer-events: auto;
  transition: all 0.1s ease-in-out;
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;

  &:hover {
    background-color: rgba(0, 0, 0, 0.5);
    color: #ffffff;
  }

  &:active {
    background-color: rgba(0, 0, 0, 0.25);
    transform: scale(0.95);
  }
`;

const Bootloader = () => {
  const [params, setParams] = useState({
    onDevice: "false",
    server: "production",
    showSimulator: "true",
    stretchToFill: "false",
    fullScreen: "false",
    brightness: "1.0",
    apiKey: "",
    useSocket: "true",
    multiPlayerMode: "false",
    externalController: "false"
  });

  // Load saved parameters from localStorage on component mount
  useEffect(() => {
    const savedParams = localStorage.getItem("bootloader_params");
    if (savedParams) {
      try {
        const parsed = JSON.parse(savedParams);
        setParams((prev) => ({
          ...prev,
          ...parsed
        }));
      } catch (error) {
        console.warn("Failed to parse saved bootloader parameters:", error);
      }
    }
  }, []);

  // Save all parameters to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("bootloader_params", JSON.stringify(params));
  }, [params]);

  const parameterDefinitions = [
    {
      key: "apiKey",
      label: "API Key",
      description: "Required to enable server and socket comms",
      type: "text",
      placeholder: "Enter your API key...",
      default: ""
    },
    {
      key: "server",
      label: "Server",
      description: "Point to production or local server",
      type: "select",
      options: [
        { value: "production", label: "Production" },
        { value: "local", label: "Local" }
      ],
      default: "auto"
    },
    {
      key: "onDevice",
      label: "Mode",
      description: "For running as simulator or on actual device",
      type: "select",
      options: [
        { value: "false", label: "Simulator" },
        { value: "true", label: "Device" }
      ],
      default: "false"
    },
    {
      key: "showSimulator",
      label: "Simulated Hardware Inputs",
      description: "Toggle visiblity of simulated hardware controls",
      type: "select",
      options: [
        { value: "true", label: "Enabled" },
        { value: "false", label: "Disabled" }
      ],
      default: "true"
    },
    {
      key: "fullScreen",
      label: "Full Screen",
      description: "Fill entire viewport",
      type: "select",
      options: [
        { value: "false", label: "Disabled" },
        { value: "true", label: "Enabled" }
      ],
      default: "false"
    },
    {
      key: "stretchToFill",
      label: "Stretch to Fill",
      description: "Fill viewport while maintaining aspect ratio",
      type: "select",
      options: [
        { value: "false", label: "Disabled" },
        { value: "true", label: "Enabled" }
      ],
      default: "false"
    },
    {
      key: "useSocket",
      label: "Sockets",
      description: "Toggle listening for socket events",
      type: "select",
      options: [
        { value: "true", label: "Enabled" },
        { value: "false", label: "Disabled" }
      ],
      default: "true"
    },
    {
      key: "multiPlayerMode",
      label: "Multiplayer Mode",
      description: "Listen for events from Play Machine Remotes",
      type: "select",
      options: [
        { value: "false", label: "Disabled" },
        { value: "true", label: "Enabled" }
      ],
      default: "false"
    },
    {
      key: "externalController",
      label: "External Controller",
      description: "Listen for events from Play Machine Mini",
      type: "select",
      options: [
        { value: "false", label: "Disabled" },
        { value: "true", label: "Enabled" }
      ],
      default: "false"
    },
    {
      key: "brightness",
      label: "Screen Brightness",
      description: "Overlay to simulate screen brightness",
      type: "range",
      min: 0.1,
      max: 1.0,
      step: 0.1,
      default: "1.0"
    }
  ];

  const handleParamChange = (key, value) => {
    setParams((prev) => ({
      ...prev,
      [key]: value
    }));
  };

  const resetToDefaults = () => {
    const defaultParams = {};
    parameterDefinitions.forEach((param) => {
      defaultParams[param.key] = param.default;
    });
    setParams(defaultParams);
    // Also clear from localStorage
    localStorage.removeItem("bootloader_params");
  };

  const constructURL = () => {
    const queryParams = new URLSearchParams();

    // Always include onDevice parameter
    queryParams.set("onDevice", params.onDevice);

    // Add other non-default parameters to keep URL clean
    parameterDefinitions.forEach((param) => {
      const value = params[param.key];
      if (
        param.key !== "onDevice" &&
        value &&
        value !== param.default &&
        value !== "auto"
      ) {
        queryParams.set(param.key, value);
      }
    });

    return `?${queryParams.toString()}`;
  };

  const handleBoot = () => {
    const queryString = constructURL();
    window.location.search = queryString;
  };

  const renderParameter = (param) => {
    const value = params[param.key];

    return (
      <ParameterSection key={param.key}>
        <ParameterInfo>
          <ParameterLabel>{param.label.toUpperCase()}</ParameterLabel>
          <ParameterDescription>{param.description}</ParameterDescription>
        </ParameterInfo>

        <ParameterControl>
          {param.type === "select" && (
            <Select
              value={value}
              onChange={(e) => handleParamChange(param.key, e.target.value)}
            >
              {param.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label.toUpperCase()}
                </option>
              ))}
            </Select>
          )}

          {param.type === "text" && (
            <Input
              type="text"
              value={value}
              placeholder={param.placeholder}
              onChange={(e) => handleParamChange(param.key, e.target.value)}
            />
          )}

          {param.type === "range" && (
            <>
              <RangeInput
                type="range"
                min={param.min}
                max={param.max}
                step={param.step}
                value={value}
                onChange={(e) => handleParamChange(param.key, e.target.value)}
              />
              <div
                style={{
                  textAlign: "center",
                  fontSize: "1rem"
                }}
              >
                {value}
              </div>
            </>
          )}
        </ParameterControl>
      </ParameterSection>
    );
  };

  return (
    <>
      <BootloaderContainer>
        <Title>Play Machine OS Bootloader</Title>

        <ParameterSectionsContainer>
          {parameterDefinitions.map(renderParameter)}
        </ParameterSectionsContainer>
      </BootloaderContainer>

      <FixedButtonContainer>
        <BootButton onClick={handleBoot}>Boot</BootButton>
        <ResetButton onClick={resetToDefaults}>Reset</ResetButton>
      </FixedButtonContainer>
    </>
  );
};

export default Bootloader;
