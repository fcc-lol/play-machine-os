import React, { useState, useEffect, useCallback, useRef } from "react";
import styled from "styled-components";
import { Map, NavigationControl } from "react-map-gl/mapbox";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useSerial } from "../../functions/SerialDataContext";
import ConvertRange from "../../functions/ConvertRange";
import * as turf from "@turf/turf";
import { circle } from "@turf/turf";

// Constants for calculations
const MAX_RADIUS_KM = 100; // 200km diameter
const MIN_RADIUS_KM = 1;
const EARTH_CIRCUMFERENCE = 40075; // Earth's circumference in km
const KM_TO_MILES = 0.621371; // Conversion factor from kilometers to miles

// Function to calculate zoom level for a given radius in km
const getZoomForRadius = (radiusKm) => {
  // Using the Mapbox zoom level formula: zoom = log2(earthCircumference / (radius * 2π))
  // For globe projection, we need to adjust the zoom level to account for the 3D projection
  const baseZoom = Math.log2(EARTH_CIRCUMFERENCE / (radiusKm * 2 * Math.PI));
  // Adjust zoom level for globe projection and desired circle size
  return baseZoom + 0.8; // Adjusted to make max diameter exactly 124 miles
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
  width: ${(props) => props.$diameter}rem;
  height: ${(props) => props.$diameter}rem;
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

const TextDisplay = styled.div`
  font-size: 1.5rem;
  color: rgba(255, 255, 255, 1);
  text-shadow: 0 0 1rem rgba(0, 0, 0, 1), 0 0 2rem rgba(0, 0, 0, 1),
    0 0 3rem rgba(0, 0, 0, 1);
  text-transform: uppercase;
  position: absolute;
  transform: translate(-50%, 0);
  left: 50%;
  z-index: 3;
  opacity: ${(props) => (props.isMoving || props.isLoading ? 0.5 : 1)};
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
`;

const RadiusDisplay = styled(TextDisplay)`
  top: 3rem;
`;

const PopulationDisplay = styled(TextDisplay)`
  bottom: 3rem;
`;

const MapContainer = styled.div`
  width: 100%;
  height: 100%;
  z-index: 1;
  position: relative;

  .mapboxgl-ctrl-scale {
    border: 2px solid #fff;
    border-top: none;
    color: #fff;
    font-size: 12px;
    padding: 2px 5px;
    background: rgba(0, 0, 0, 0.5);
    margin: 10px;
  }
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
  const [viewState, setViewState] = useState({
    longitude: -74.006,
    latitude: 40.7128,
    zoom: 4,
    projection: "globe",
    minZoom: minZoom,
    maxZoom: maxZoom,
    bearing: 0
  });
  const [firstMapOpacity, setFirstMapOpacity] = useState(0.5);
  const [secondMapOpacity, setSecondMapOpacity] = useState(0.5);
  const [thirdMapOpacity, setThirdMapOpacity] = useState(0.5);
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
    longitude: -74.006,
    latitude: 40.7128
  });

  const [currentScale, setCurrentScale] = useState(1);

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
    if (!mapRef.current) return 0;
    const map = mapRef.current.getMap();
    try {
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

      // Scale the radius to match the visual size of the circle
      const scaleFactor = 1.35; // Adjusted to allow for maximum 100km radius
      const scaledRadius = radius * scaleFactor;

      const clampedRadius = Math.min(
        Math.max(scaledRadius, MIN_RADIUS_KM),
        MAX_RADIUS_KM
      );

      // Ensure we never return NaN
      return isNaN(clampedRadius) ? 0 : clampedRadius;
    } catch (error) {
      console.error("Error calculating radius:", error);
      return 0;
    }
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

    // Invert the value so 0% gives max diameter (200km) and 100% gives min diameter
    const invertedValue = 100 - Math.min(zoomValue, 96);
    const scaledZoomValue = ConvertRange(invertedValue, minZoom, maxZoom);

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
      // Allow for 3 full rotations (1080 degrees) to make it easier to rotate the globe
      const newBearing = ConvertRange(rotationValue, 0, 1080);
      setViewState((prevState) => ({
        ...prevState,
        bearing: newBearing
      }));
    }

    const longitudeValue = serialData.knob_1?.value || 0;
    // Only update if the knob value has actually changed
    if (longitudeValue !== lastKnob1Value) {
      // Calculate both movement types
      const directLongitude = ConvertRange(longitudeValue, -180, 180);
      const incrementalChange =
        ((longitudeValue - lastKnob1Value) / 100) *
        (360 * (knob1Sensitivity / 100)) *
        0.2;

      // At sensitivity 0: pure incremental, at 100: pure direct
      const newLongitude =
        knob1Sensitivity === 0
          ? normalizeLongitude(viewState.longitude + incrementalChange)
          : knob1Sensitivity === 100
          ? directLongitude
          : normalizeLongitude(
              viewState.longitude +
                incrementalChange * (1 - knob1Sensitivity / 100)
            );

      // Update the view state
      setViewState((prevState) => ({
        ...prevState,
        longitude: newLongitude,
        latitude: viewState.latitude
      }));

      // Update mini map state
      setMiniMapState({
        longitude: newLongitude,
        latitude: viewState.latitude
      });

      setLastKnob1Value(longitudeValue);
    }

    const latitudeValue = serialData.knob_2?.value || 0;
    // Only update if the knob value has actually changed
    if (latitudeValue !== lastKnob2Value) {
      // Calculate both movement types
      const directLatitude = ConvertRange(latitudeValue, -90, 90);
      const incrementalChange =
        ((latitudeValue - lastKnob2Value) / 100) *
        (180 * (knob2Sensitivity / 100)) *
        0.5;

      // At sensitivity 0: pure incremental, at 100: pure direct
      const newLatitude =
        knob2Sensitivity === 0
          ? viewState.latitude + incrementalChange
          : knob2Sensitivity === 100
          ? directLatitude
          : viewState.latitude +
            incrementalChange * (1 - knob2Sensitivity / 100);

      // Update the view state
      setViewState((prevState) => ({
        ...prevState,
        longitude: viewState.longitude,
        latitude: newLatitude
      }));

      // Update mini map state
      setMiniMapState({
        longitude: viewState.longitude,
        latitude: newLatitude
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

  useEffect(() => {
    if (mapRef.current) {
      const map = mapRef.current.getMap();

      const updateScale = () => {
        // Get the current scale from the map's transform
        const transform = map.transform;
        const scale = transform.scale;
        setCurrentScale(scale);
      };

      map.on("move", updateScale);
      map.on("zoom", updateScale);

      return () => {
        map.off("move", updateScale);
        map.off("zoom", updateScale);
      };
    }
  }, []);

  // Calculate circle diameter in rem units based on zoom level, radius, and scale
  const getCircleDiameter = () => {
    const baseSize = 20; // Base size in rem
    return baseSize;
  };

  return (
    <AppContainer>
      <RadiusDisplay>
        {Math.round(getRadiusKm() * 2)} km /{" "}
        {Math.round(getRadiusKm() * 2 * KM_TO_MILES)} mi
      </RadiusDisplay>
      <Target $diameter={getCircleDiameter()} />
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
            projection="globe"
            minZoom={minZoom}
            maxZoom={maxZoom}
          >
            <NavigationControl
              showCompass={false}
              showZoom={false}
              position="bottom-left"
            />
          </Map>
        </FirstMap>
        <SecondMap $opacity={secondMapOpacity}>
          <Map
            mapboxAccessToken={process.env.REACT_APP_MAPBOX_ACCESS_TOKEN}
            {...viewState}
            bearing={-viewState.bearing}
            onMove={onMove}
            mapStyle="mapbox://styles/mapbox/dark-v11"
            interactive={false}
            projection="globe"
            minZoom={minZoom}
            maxZoom={maxZoom}
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
            projection="globe"
            minZoom={minZoom}
            maxZoom={maxZoom}
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
          projection="globe"
          bearing={-viewState.bearing}
          interactive={false}
          mapStyle="mapbox://styles/mapbox/streets-v12"
          width="100%"
          height="100%"
        />
        <MiniMapTarget $scale={getRadiusKm() / 180} />
      </MiniMapContainer>
    </AppContainer>
  );
};

export default MapComponent;
