import React, { useRef, useEffect, useState, useCallback } from "react";
import "./App.css";

// Pattern generation utilities ported from Arduino code
class PatternGenerator {
  constructor() {
    this.cachedPalette = new Array(5);
    this.cachedShapeByte = 0;
    this.cachedStyleByte = 0;
    this.cachedSparsityByte = 0;
    this.cachedPatternSeedByte = 0;
    this.cachedRingSizeModifier = 1.0;
    this.staticDistances = Array(13)
      .fill()
      .map(() => Array(9).fill(0));
    this.patternDirty = true;
  }

  // Generate HSV color and convert to RGB
  hsvToRgb(h, s, v) {
    const c = (v / 100) * (s / 100);
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = v / 100 - c;

    let r, g, b;
    if (h >= 0 && h < 60) {
      r = c;
      g = x;
      b = 0;
    } else if (h >= 60 && h < 120) {
      r = x;
      g = c;
      b = 0;
    } else if (h >= 120 && h < 180) {
      r = 0;
      g = c;
      b = x;
    } else if (h >= 180 && h < 240) {
      r = 0;
      g = x;
      b = c;
    } else if (h >= 240 && h < 300) {
      r = x;
      g = 0;
      b = c;
    } else {
      r = c;
      g = 0;
      b = x;
    }

    return {
      r: Math.round((r + m) * 255),
      g: Math.round((g + m) * 255),
      b: Math.round((b + m) * 255),
    };
  }

  generatePalette(rSeed, gSeed, bSeed) {
    console.log("Generating palette with seeds:", rSeed, gSeed, bSeed);
    const baseHue = ((rSeed << 8) | gSeed) % 360;
    const baseSaturation = 200 + (bSeed % 56);
    const baseValue = 200 + (gSeed % 56);

    for (let i = 0; i < 5; i++) {
      const hue = (baseHue + i * (360 / 5)) % 360;
      const saturation = baseSaturation - i * 10;
      const value = baseValue - i * 10;
      const rgb = this.hsvToRgb(hue, saturation, value);
      // Use RBG order to match Arduino IS3741_RBG configuration
      this.cachedPalette[i] = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
    }
    console.log("Generated palette:", this.cachedPalette);
  }

  precalculatePattern(uid, isDoubleResolution = false) {
    if (uid.length < 7) return;

    // Generate and cache the color palette
    this.generatePalette(uid[0], uid[1], uid[2]);

    // Cache UID bytes for variety
    this.cachedShapeByte = uid[3];
    this.cachedStyleByte = uid[4];
    this.cachedSparsityByte = uid[5];
    this.cachedPatternSeedByte = uid[6];

    // Cache ring size modifier
    this.cachedRingSizeModifier =
      1.0 + ((this.cachedShapeByte >> 4) & 0x03) * 0.15;

    const gridWidth = isDoubleResolution ? 26 : 13;
    const gridHeight = isDoubleResolution ? 18 : 9;
    // Match Arduino: 13x9 matrix with center at (6, 4)
    const centerX = isDoubleResolution ? 12 : 6;
    const centerY = isDoubleResolution ? 8 : 4;
    const shapeType = this.cachedShapeByte % 3;

    // Resize staticDistances array if needed
    if (
      this.staticDistances.length !== gridWidth ||
      this.staticDistances[0].length !== gridHeight
    ) {
      this.staticDistances = Array(gridWidth)
        .fill()
        .map(() => Array(gridHeight).fill(0));
    }

    // Pre-calculate static distances for each pixel in the top-left quadrant
    for (let y = 0; y <= centerY; y++) {
      for (let x = 0; x <= centerX; x++) {
        if (x === centerX && y === centerY) {
          this.staticDistances[x][y] = 0;
          continue;
        }

        const dx = Math.abs(x - centerX);
        const dy = Math.abs(y - centerY);
        let d;

        // Shape Selection
        if (shapeType === 0) {
          d = dx + dy;
        } else if (shapeType === 1) {
          d = Math.sqrt(dx * dx + dy * dy);
        } else {
          d = Math.max(dx, dy);
        }

        // Shape Variety Modifiers
        const twistFactor = (this.cachedStyleByte & 0x03) * 0.05;
        if (twistFactor > 0 && dx + dy > 0) {
          const angle = Math.atan2(dy, dx);
          d += twistFactor * angle * 2;
        }

        const pinchFactor = (((this.cachedStyleByte >> 2) & 0x03) - 1.5) * 0.2;
        if (pinchFactor !== 0 && dx + dy > 0) {
          const diagonalInfluence = (2.0 * dx * dy) / (dx * dx + dy * dy);
          d -= pinchFactor * diagonalInfluence * d;
        }

        const jaggedStrength = ((this.cachedStyleByte >> 4) & 0x03) * 0.15;
        if (jaggedStrength > 0) {
          const posHash = x * 13 + y * 29;
          d += Math.sin((posHash * Math.PI) / 7.0) * jaggedStrength;
        }

        this.staticDistances[x][y] = d;
      }
    }

    this.patternDirty = false;
  }

  drawSymmetricalPattern(uid, t, canvas, ctx, isDoubleResolution = false) {
    console.log(
      "drawSymmetricalPattern called with UID:",
      uid,
      "canvas size:",
      canvas.width,
      "x",
      canvas.height
    );

    if (this.patternDirty) {
      console.log("Pattern is dirty, recalculating...");
      this.precalculatePattern(uid, isDoubleResolution);
    }

    // Clear canvas
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (uid.length < 7) {
      console.log("UID too short:", uid.length);
      return;
    }

    const gridWidth = isDoubleResolution ? 26 : 13;
    const gridHeight = isDoubleResolution ? 18 : 9;
    // Match Arduino: 13x9 matrix with center at (6, 4)
    const centerX = isDoubleResolution ? 12 : 6;
    const centerY = isDoubleResolution ? 8 : 4;

    // Draw center pixel
    const centerColor = this.cachedPalette[this.cachedPatternSeedByte % 5];
    console.log("Drawing center pixel with color:", centerColor);
    this.drawPixel(
      ctx,
      centerX,
      centerY,
      centerColor,
      canvas.width,
      canvas.height,
      gridWidth,
      gridHeight
    );

    // Iterate over top-left quadrant and mirror
    let pixelsDrawn = 0;
    for (let y = 0; y <= centerY; y++) {
      for (let x = 0; x <= centerX; x++) {
        if (x === centerX && y === centerY) continue;

        // Load pre-calculated distance
        let d = this.staticDistances[x][y];
        if (d < 0) d = 0;

        // Apply ring size modifier before animation
        d /= this.cachedRingSizeModifier;

        // Animation
        const animationSpeed = 0.001;
        const animationOffset = t * animationSpeed;
        const ringCyclePeriod = 4.0;

        const dShifted = d - animationOffset;
        // Match Arduino fmod behavior exactly
        d = ((dShifted % ringCyclePeriod) + ringCyclePeriod) % ringCyclePeriod;

        // Determine which ring the pixel belongs to
        const ringIndex = Math.floor(d);

        if (ringIndex < 1) continue;

        // Sparsity and Pixel Activation
        let hash = (this.cachedPatternSeedByte * 31 + x) * 31 + y;
        hash = (hash ^ this.cachedStyleByte) * 31 + ringIndex;

        if (hash % 256 > this.cachedSparsityByte) {
          const color =
            this.cachedPalette[(this.cachedPatternSeedByte + ringIndex) % 5];

          // Draw the pixel in all 4 quadrants for symmetry (match Arduino exactly)
          this.drawPixel(
            ctx,
            x,
            y,
            color,
            canvas.width,
            canvas.height,
            gridWidth,
            gridHeight
          ); // Top-left
          this.drawPixel(
            ctx,
            12 - x,
            y,
            color,
            canvas.width,
            canvas.height,
            gridWidth,
            gridHeight
          ); // Top-right
          this.drawPixel(
            ctx,
            x,
            8 - y,
            color,
            canvas.width,
            canvas.height,
            gridWidth,
            gridHeight
          ); // Bottom-left
          this.drawPixel(
            ctx,
            12 - x,
            8 - y,
            color,
            canvas.width,
            canvas.height,
            gridWidth,
            gridHeight
          ); // Bottom-right
          pixelsDrawn += 4;
        }
      }
    }
    console.log("Total pixels drawn:", pixelsDrawn + 1); // +1 for center pixel
  }

  drawPixel(
    ctx,
    x,
    y,
    color,
    canvasWidth,
    canvasHeight,
    gridWidth = 13,
    gridHeight = 9
  ) {
    const cellWidth = canvasWidth / gridWidth;
    const cellHeight = canvasHeight / gridHeight;
    const startX = x * cellWidth;
    const startY = y * cellHeight;

    ctx.fillStyle = color;
    ctx.fillRect(startX, startY, cellWidth, cellHeight);
  }

  generateRandomUID() {
    const uid = new Array(7);
    for (let i = 0; i < 7; i++) {
      uid[i] = Math.floor(Math.random() * 256);
    }
    return uid;
  }
}

function App() {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const patternGeneratorRef = useRef(new PatternGenerator());
  const [currentUID, setCurrentUID] = useState(null);
  const [isDoubleResolution, setIsDoubleResolution] = useState(false);
  const [currentHash, setCurrentHash] = useState(null);
  const [isPolling, setIsPolling] = useState(true);

  // Convert hash string to UID array
  const hashToUID = useCallback((hashString) => {
    console.log("Converting hash to UID:", hashString);
    if (!hashString || hashString.length < 8) {
      console.log("Hash too short or empty:", hashString);
      return null;
    }

    const uid = new Array(7);

    if (hashString.length === 8) {
      // For 8-character hash, use pairs of characters (4 pairs = 8 chars)
      for (let i = 0; i < 4; i++) {
        const hexPair = hashString.substring(i * 2, i * 2 + 2);
        uid[i] = parseInt(hexPair, 16);
      }
      // Pad remaining slots with zeros
      for (let i = 4; i < 7; i++) {
        uid[i] = 0;
      }
    } else {
      // For longer hashes, use pairs of characters
      for (let i = 0; i < 7; i++) {
        const hexPair = hashString.substring(i * 2, i * 2 + 2);
        uid[i] = parseInt(hexPair, 16);
      }
    }

    console.log("Generated UID array:", uid);
    return uid;
  }, []);

  // Fetch hash from API
  const fetchHash = useCallback(async () => {
    try {
      // Always use absolute URL - configure CORS on the server at 192.168.8.195:8080
      const apiUrl = "http://192.168.8.195:8080/hash";
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();

      console.log("API Response:", data);
      console.log("Current hash:", currentHash);
      console.log("New hash:", data.hash);
      console.log("Hash changed:", data.hash !== currentHash);

      if (data.has_data && data.hash && data.hash !== currentHash) {
        console.log("Updating hash from", currentHash, "to", data.hash);
        setCurrentHash(data.hash);
        const newUID = hashToUID(data.hash);
        console.log("Generated UID:", newUID);
        if (newUID) {
          setCurrentUID(newUID);
          patternGeneratorRef.current.patternDirty = true;
          console.log("Pattern marked as dirty, UID updated");
        }
      }
    } catch (error) {
      console.error("Error fetching hash:", error);
    }
  }, [currentHash, hashToUID]);

  const animate = useCallback(() => {
    if (currentUID && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      const t = Date.now();

      console.log("Animating with UID:", currentUID);
      patternGeneratorRef.current.drawSymmetricalPattern(
        currentUID,
        t,
        canvas,
        ctx,
        isDoubleResolution
      );
    } else {
      console.log(
        "Not animating - currentUID:",
        currentUID,
        "canvasRef:",
        !!canvasRef.current
      );
    }
    animationRef.current = requestAnimationFrame(animate);
  }, [currentUID, isDoubleResolution]);

  useEffect(() => {
    // Set canvas size to fill screen
    const resizeCanvas = () => {
      if (canvasRef.current) {
        const canvas = canvasRef.current;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
    };
  }, []);

  useEffect(() => {
    if (currentUID) {
      animate();
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [currentUID, animate]);

  // Polling effect
  useEffect(() => {
    if (!isPolling) return;

    const pollInterval = setInterval(() => {
      fetchHash();
    }, 500); // Poll every 0.5 seconds

    // Initial fetch
    fetchHash();

    return () => {
      clearInterval(pollInterval);
    };
  }, [isPolling, fetchHash]);

  return (
    <div className='App'>
      <canvas
        ref={canvasRef}
        style={{
          display: "block",
          width: "100vw",
          height: "100vh",
        }}
      />
    </div>
  );
}

export default App;
