import React, { useState, useEffect, useCallback, useRef } from "react";
import styled from "styled-components";
import { Map } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { useSerial } from "../../functions/SerialDataContext";
import ConvertRange from "../../functions/ConvertRange";

// Constants for calculations
const MAX_RADIUS_KM = 50;
const MIN_RADIUS_KM = 1;
const EARTH_CIRCUMFERENCE = 40075; // Earth's circumference in km

// Function to calculate zoom level for a given radius in km
const getZoomForRadius = (radiusKm) => {
  // Using the Mapbox zoom level formula: zoom = log2(earthCircumference / (radius * 2π))
  return Math.log2(EARTH_CIRCUMFERENCE / (radiusKm * 2 * Math.PI));
};

// Function to normalize longitude to be between -180 and 180
const normalizeLongitude = (longitude) => {
  let normalized = longitude;
  while (normalized > 180) normalized -= 360;
  while (normalized < -180) normalized += 360;
  return normalized;
};

const CIRCLE_DIAMETER_REM = 20;
const REM_IN_PX = 16;
const CIRCLE_RADIUS_PX = (CIRCLE_DIAMETER_REM * REM_IN_PX) / 2;

// Custom debounce hook
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Add a new custom hook for debouncing API calls
const useDebouncedApiCall = (callback, delay) => {
  const timeoutRef = useRef();
  const callbackRef = useRef(callback);

  // Update the callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback(
    (...args) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    },
    [delay]
  );
};

const AppContainer = styled.div`
  width: 100%;
  height: 100%;
  position: relative;
`;

const Target = styled.div`
  width: 20rem;
  height: 20rem;
  border: 4px solid rgba(255, 255, 255, 1);
  box-shadow: 0 0 1rem rgba(0, 0, 0, 0.5), 0 0 20rem rgba(0, 0, 0, 1);
  border-radius: 50%;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const PopulationDisplay = styled.div`
  font-size: 1.5rem;
  color: rgba(255, 255, 255, 1);
  text-shadow: 0 0 1rem rgba(0, 0, 0, 1), 0 0 2rem rgba(0, 0, 0, 1),
    0 0 3rem rgba(0, 0, 0, 1);
  text-transform: uppercase;
  padding: 0.5rem 1rem;
  border-radius: 1rem;
  position: absolute;
  bottom: 1rem;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 3;
  opacity: ${(props) => (props.isMoving || props.isLoading ? 0.5 : 1)};
`;

const MapContainer = styled.div`
  width: 100%;
  height: 100%;
  z-index: 1;
  position: relative;
`;

const FirstMap = styled.div`
  position: absolute !important;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
  opacity: ${(props) => props.$opacity};

  .mapboxgl-canvas-container {
    opacity: inherit;
  }
`;

const SecondMap = styled.div`
  position: absolute !important;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 2;
  opacity: ${(props) => props.$opacity};
  mix-blend-mode: plus-lighter;

  .mapboxgl-canvas-container {
    opacity: inherit;
  }
`;

const ThirdMap = styled.div`
  position: absolute !important;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 3;
  opacity: ${(props) => props.$opacity};
  mix-blend-mode: overlay;

  .mapboxgl-canvas-container {
    opacity: inherit;
  }
`;

const MiniMapContainer = styled.div`
  position: absolute;
  top: 1rem;
  right: 1rem;
  width: calc(1024px / 5);
  height: calc(600px / 5);
  border-radius: 0.5rem;
  overflow: hidden;
  z-index: 3;
  box-shadow: 0 0 1rem rgba(0, 0, 0, 0.75), 0 0 8rem rgba(0, 0, 0, 1);

  .mapboxgl-ctrl-bottom-left,
  .mapboxgl-ctrl-bottom-right {
    display: none;
  }
`;

const MiniMapTarget = styled.div`
  width: ${(props) => props.$scale * CIRCLE_DIAMETER_REM * 0.2}rem;
  height: ${(props) => props.$scale * CIRCLE_DIAMETER_REM * 0.2}rem;
  border: 2px solid rgba(255, 255, 255, 1);
  box-shadow: 0 0 0.5rem rgba(0, 0, 0, 0.5), 0 0 10rem rgba(0, 0, 0, 1);
  border-radius: 50%;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 2;
  pointer-events: none;
`;

const MapComponent = () => {
  const { serialData } = useSerial();
  const minZoom = Math.max(0, getZoomForRadius(MAX_RADIUS_KM));
  const maxZoom = Math.min(11, getZoomForRadius(MIN_RADIUS_KM));

  // Add sensitivity state for knob_1
  const [knob1Sensitivity, setKnob1Sensitivity] = useState(50); // Default sensitivity of 50
  const [knob2Sensitivity, setKnob2Sensitivity] = useState(50); // Default sensitivity of 50
  const [lastKnob1Value, setLastKnob1Value] = useState(0);
  const [lastKnob2Value, setLastKnob2Value] = useState(0);

  // Calculate initial values from serial data
  const initialZoom = ConvertRange(
    serialData.horizontal_slider?.value || 0,
    minZoom,
    maxZoom
  );
  const initialLongitude = ConvertRange(
    serialData.knob_1?.value || 0,
    -180,
    180
  );
  const initialLatitude = ConvertRange(serialData.knob_2?.value || 0, -90, 90);
  const initialFirstMapOpacity = ConvertRange(
    serialData.vertical_slider_1?.value || 0,
    0,
    1
  );
  const initialSecondMapOpacity = ConvertRange(
    serialData.vertical_slider_2?.value || 0,
    0,
    1
  );
  const initialThirdMapOpacity = ConvertRange(
    serialData.vertical_slider_3?.value || 0,
    0,
    1
  );

  const [viewState, setViewState] = useState({
    longitude: initialLongitude,
    latitude: initialLatitude,
    zoom: initialZoom,
    projection: "mercator",
    minZoom: minZoom,
    maxZoom: maxZoom,
    bearing: 0 // Add initial bearing (rotation) of 0 degrees
  });
  const [firstMapOpacity, setFirstMapOpacity] = useState(
    initialFirstMapOpacity
  );
  const [secondMapOpacity, setSecondMapOpacity] = useState(
    initialSecondMapOpacity
  );
  const [thirdMapOpacity, setThirdMapOpacity] = useState(
    initialThirdMapOpacity
  );
  const [population, setPopulation] = useState(null);
  const [isMoving, setIsMoving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const mapRef = useRef();
  const [zoomConstraints, setZoomConstraints] = useState({
    min: minZoom,
    max: maxZoom
  });

  // Add separate state for mini map
  const [miniMapState, setMiniMapState] = useState({
    longitude: initialLongitude,
    latitude: initialLatitude
  });

  // Set zoom constraints on mount
  useEffect(() => {
    setZoomConstraints({ min: minZoom, max: maxZoom });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reduce debounce time for more responsive updates
  const debouncedLatitude = useDebounce(viewState.latitude, 50);
  const debouncedLongitude = useDebounce(viewState.longitude, 50);
  const debouncedZoom = useDebounce(viewState.zoom, 50);

  // Modify the getRadiusKm function to enforce both min and max
  const getRadiusKm = () => {
    if (!mapRef.current) return MAX_RADIUS_KM;
    const map = mapRef.current.getMap();
    const center = map.project([viewState.longitude, viewState.latitude]);
    const edge = { x: center.x + CIRCLE_RADIUS_PX, y: center.y };
    const edgeLngLat = map.unproject([edge.x, edge.y]);
    // Haversine formula
    const R = 6371; // Earth radius in km
    const dLat = ((edgeLngLat.lat - viewState.latitude) * Math.PI) / 180;
    const dLon = ((edgeLngLat.lng - viewState.longitude) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((viewState.latitude * Math.PI) / 180) *
        Math.cos((edgeLngLat.lat * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const radius = R * c;
    const clampedRadius = Math.min(
      Math.max(radius, MIN_RADIUS_KM),
      MAX_RADIUS_KM
    );

    return clampedRadius;
  };

  const fetchPopulation = useCallback(async () => {
    const radiusKm = getRadiusKm();
    const formattedRadius = Math.round(radiusKm);
    setIsLoading(true);
    try {
      const normalizedLongitude = normalizeLongitude(debouncedLongitude);
      const response = await fetch(
        `https://ringpopulationsapi.azurewebsites.net/api/globalringpopulations?latitude=${debouncedLatitude.toFixed(
          6
        )}&longitude=${normalizedLongitude.toFixed(
          6
        )}&distance_km=${formattedRadius}`
      );
      const data = await response.json();
      if (data && data.length > 0) {
        setPopulation(data[0].people);
        setIsMoving(false);
      }
    } catch (error) {
      console.error("Error fetching population data:", error);
      setIsMoving(false);
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedLatitude, debouncedLongitude, debouncedZoom, getRadiusKm]);

  // Create a debounced version of fetchPopulation
  const debouncedFetchPopulation = useDebouncedApiCall(fetchPopulation, 200);

  // Modify the serial data effect to handle view state updates with smooth transitions
  useEffect(() => {
    // Only proceed if we have actual serial data
    if (
      !serialData.horizontal_slider &&
      !serialData.knob_1 &&
      !serialData.knob_2 &&
      !serialData.knob_4
    ) {
      return;
    }

    const zoomValue = serialData.horizontal_slider?.value || 0;
    const scaledZoomValue = ConvertRange(
      zoomValue,
      zoomConstraints.min,
      zoomConstraints.max
    );

    // Update zoom regardless of other changes
    if (scaledZoomValue !== viewState.zoom) {
      setViewState((prevState) => ({
        ...prevState,
        zoom: scaledZoomValue
      }));
    }

    // Handle rotation with knob_4
    if (serialData.knob_4) {
      const rotationValue = serialData.knob_4.value || 0;
      const newBearing = ConvertRange(rotationValue, 0, 360);
      setViewState((prevState) => ({
        ...prevState,
        bearing: newBearing
      }));
    }

    const longitudeValue = serialData.knob_1?.value || 0;
    // Only update if the knob value has actually changed
    if (longitudeValue !== lastKnob1Value) {
      const knobChange = longitudeValue - lastKnob1Value;
      // Apply the change scaled by sensitivity
      const scaledLongitudeValue = normalizeLongitude(
        viewState.longitude +
          (knobChange / 100) * (360 * (knob1Sensitivity / 100))
      );

      // Update the view state
      setViewState((prevState) => ({
        ...prevState,
        longitude: scaledLongitudeValue,
        latitude: viewState.latitude
      }));

      // Update mini map state
      setMiniMapState({
        longitude: scaledLongitudeValue,
        latitude: viewState.latitude
      });

      setLastKnob1Value(longitudeValue);
    }

    const latitudeValue = serialData.knob_2?.value || 0;
    // Only update if the knob value has actually changed
    if (latitudeValue !== lastKnob2Value) {
      const knobChange = latitudeValue - lastKnob2Value;
      // Apply the change scaled by sensitivity
      const scaledLatitudeValue = Math.max(
        -90,
        Math.min(
          90,
          viewState.latitude +
            (knobChange / 100) * (180 * (knob2Sensitivity / 100))
        )
      );

      // Update the view state
      setViewState((prevState) => ({
        ...prevState,
        longitude: viewState.longitude,
        latitude: scaledLatitudeValue
      }));

      // Update mini map state
      setMiniMapState({
        longitude: viewState.longitude,
        latitude: scaledLatitudeValue
      });

      setLastKnob2Value(latitudeValue);
    }

    // Only set isMoving if any of the values have actually changed
    if (
      scaledZoomValue !== viewState.zoom ||
      longitudeValue !== lastKnob1Value ||
      latitudeValue !== lastKnob2Value
    ) {
      setIsMoving(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serialData, zoomConstraints]);

  // Add effect to handle first map opacity changes
  useEffect(() => {
    if (serialData.vertical_slider_1) {
      const newOpacity = ConvertRange(serialData.vertical_slider_1.value, 0, 1);
      setFirstMapOpacity(newOpacity);
    }
  }, [serialData.vertical_slider_1]);

  // Add effect to handle second map opacity changes
  useEffect(() => {
    if (serialData.vertical_slider_2) {
      const newOpacity = ConvertRange(serialData.vertical_slider_2.value, 0, 1);
      setSecondMapOpacity(newOpacity);
    }
  }, [serialData.vertical_slider_2]);

  // Add effect to handle third map opacity changes
  useEffect(() => {
    if (serialData.vertical_slider_3) {
      const newOpacity = ConvertRange(serialData.vertical_slider_3.value, 0, 1);
      setThirdMapOpacity(newOpacity);
    }
  }, [serialData.vertical_slider_3]);

  // Add effect to handle knob_3 sensitivity changes
  useEffect(() => {
    if (serialData.knob_3) {
      const newSensitivity = ConvertRange(serialData.knob_3.value, 1, 100);
      setKnob1Sensitivity(newSensitivity);
    }
  }, [serialData.knob_3]);

  // Add effect to handle knob_5 sensitivity changes
  useEffect(() => {
    if (serialData.knob_5) {
      const newSensitivity = ConvertRange(serialData.knob_5.value, 1, 100);
      setKnob2Sensitivity(newSensitivity);
    }
  }, [serialData.knob_5]);

  // Effect to handle population fetching based on all debounced values
  useEffect(() => {
    debouncedFetchPopulation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedLatitude, debouncedLongitude, debouncedZoom]);

  // Handle map movement
  const onMove = useCallback((evt) => {
    setViewState(evt.viewState);
    setIsMoving(true);
  }, []);

  return (
    <AppContainer>
      <Target />
      <PopulationDisplay isMoving={isMoving} isLoading={isLoading}>
        {population === 0
          ? "No people"
          : population > 0
          ? population === 1
            ? "1 person"
            : population.toLocaleString() + " people"
          : "Loading..."}
      </PopulationDisplay>
      <MapContainer>
        <FirstMap $opacity={firstMapOpacity}>
          <Map
            ref={mapRef}
            mapboxAccessToken={process.env.REACT_APP_MAPBOX_ACCESS_TOKEN}
            {...viewState}
            bearing={-viewState.bearing}
            onMove={onMove}
            mapStyle="mapbox://styles/mapbox/satellite-v9"
            interactive={false}
          />
        </FirstMap>
        <SecondMap $opacity={secondMapOpacity}>
          <Map
            mapboxAccessToken={process.env.REACT_APP_MAPBOX_ACCESS_TOKEN}
            {...viewState}
            bearing={-viewState.bearing}
            onMove={onMove}
            mapStyle="mapbox://styles/mapbox/dark-v11"
            interactive={false}
          />
        </SecondMap>
        <ThirdMap $opacity={thirdMapOpacity}>
          <Map
            mapboxAccessToken={process.env.REACT_APP_MAPBOX_ACCESS_TOKEN}
            {...viewState}
            bearing={-viewState.bearing}
            onMove={onMove}
            mapStyle="mapbox://styles/mapbox/light-v11"
            interactive={false}
          />
        </ThirdMap>
      </MapContainer>
      <MiniMapContainer>
        <Map
          mapboxAccessToken={process.env.REACT_APP_MAPBOX_ACCESS_TOKEN}
          latitude={viewState.latitude}
          longitude={viewState.longitude}
          zoom={4}
          minZoom={0}
          maxZoom={11}
          projection="mercator"
          bearing={-viewState.bearing}
          interactive={false}
          mapStyle="mapbox://styles/mapbox/streets-v12"
          width="100%"
          height="100%"
        />
        <MiniMapTarget $scale={(1 / Math.pow(2, viewState.zoom - 4)) * 4} />
      </MiniMapContainer>
    </AppContainer>
  );
};

export default MapComponent;
