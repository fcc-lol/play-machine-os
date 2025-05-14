import styled from "styled-components";
import { useSerial } from "../../functions/SerialDataContext";
import { useMemo, useEffect, useRef, useState } from "react";
import ConvertRange from "../../functions/ConvertRange";
import * as THREE from "three";

const Root = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  height: calc(100%);
  width: calc(100%);
  background-color: ${(props) => props.theme.background};
  color: ${(props) => props.theme.text};
  font-family: ${(props) => props.theme.fontFamily};
  font-size: 1.25rem;
`;

const RainMachine = () => {
  const { serialData } = useSerial();
  const [lightnessDelta, setLightnessDelta] = useState(0);
  const containerRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const cubeRef = useRef(null);
  const offsetRef = useRef(0);
  const baseCellSize = 32;
  const basePixelSize = 2;

  // Handle button presses for lightness control
  useEffect(() => {
    if (serialData.button_left?.value) {
      setLightnessDelta((prev) => Math.max(-50, prev - 1));
    }
    if (serialData.button_right?.value) {
      setLightnessDelta((prev) => Math.min(50, prev + 1));
    }
  }, [serialData.button_left?.value, serialData.button_right?.value]);

  const inputs = useMemo(() => {
    const scaleFactor = ConvertRange(
      serialData.vertical_slider_3.value,
      0.125,
      1
    );

    const cellSizeIndex = Math.floor(scaleFactor * 8);
    const cellSize = baseCellSize * Math.pow(2, cellSizeIndex);

    const pixelSizeIndex = Math.floor(scaleFactor * 8);
    const pixelSize = basePixelSize * Math.pow(2, pixelSizeIndex);

    return {
      iMult: ConvertRange(serialData.knob_1.value, 0, 2),
      jMult: ConvertRange(serialData.knob_2.value, 0, 2),
      exprMult: ConvertRange(serialData.knob_3.value, 0, 128),
      modVal: ConvertRange(serialData.knob_4.value, 0, 128),
      threshold: ConvertRange(serialData.knob_5.value, 0, 1),
      speed: ConvertRange(serialData.horizontal_slider.value, 0, 0.2),
      rotationSpeed: ConvertRange(serialData.horizontal_slider.value, 0, 0.05),
      hue: ConvertRange(serialData.vertical_slider_1.value, 180, -180),
      backgroundHue: ConvertRange(serialData.vertical_slider_2.value, 0, 360),
      monochromeControls: {
        background: serialData.button_down?.value,
        foreground: serialData.button_up?.value
      },
      cellSize,
      pixelSize
    };
  }, [serialData]);

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current) return;

    // Create scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Create camera
    const camera = new THREE.PerspectiveCamera(
      75,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 12;
    cameraRef.current = camera;

    // Create renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(
      containerRef.current.clientWidth,
      containerRef.current.clientHeight
    );
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Create cube
    const geometry = new THREE.BoxGeometry(8, 8, 8);
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const cube = new THREE.Mesh(geometry, material);
    scene.add(cube);
    cubeRef.current = cube;

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 1);
    pointLight.position.set(10, 10, 10);
    scene.add(pointLight);

    // Handle window resize
    const handleResize = () => {
      if (!containerRef.current) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener("resize", handleResize);

    let animationFrameId;
    // Animation loop
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      if (cubeRef.current && inputs.rotationSpeed > 0) {
        cubeRef.current.rotation.x += inputs.rotationSpeed;
        cubeRef.current.rotation.y += inputs.rotationSpeed;
      }

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      window.removeEventListener("resize", handleResize);

      // Properly dispose of Three.js resources
      if (cubeRef.current) {
        cubeRef.current.geometry.dispose();
        if (Array.isArray(cubeRef.current.material)) {
          cubeRef.current.material.forEach((material) => material.dispose());
        } else {
          cubeRef.current.material.dispose();
        }
      }

      if (rendererRef.current) {
        rendererRef.current.dispose();
        if (containerRef.current && rendererRef.current.domElement) {
          containerRef.current.removeChild(rendererRef.current.domElement);
        }
      }

      // Clear refs
      sceneRef.current = null;
      cameraRef.current = null;
      cubeRef.current = null;
      rendererRef.current = null;
    };
  }, []); // Removed inputs dependency

  // Update pattern texture
  useEffect(() => {
    if (!cubeRef.current) return;

    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");

    const offscreenCanvas = document.createElement("canvas");
    offscreenCanvas.width = canvas.width;
    offscreenCanvas.height = canvas.height;
    const offscreenCtx = offscreenCanvas.getContext("2d");

    function drawPattern() {
      const {
        iMult,
        jMult,
        exprMult,
        modVal,
        threshold,
        hue,
        backgroundHue,
        cellSize,
        pixelSize,
        monochromeControls,
        speed
      } = inputs;

      const baseLightness = 50;
      const backgroundLightness = baseLightness + lightnessDelta;
      const foregroundLightness = baseLightness - lightnessDelta;

      if (monochromeControls.background === true) {
        offscreenCtx.fillStyle = "black";
      } else {
        offscreenCtx.fillStyle = `hsl(${backgroundHue}, 100%, ${backgroundLightness}%)`;
      }

      offscreenCtx.fillRect(0, 0, canvas.width, canvas.height);

      const sinWaveMultiplier = 0.1;
      const halfModVal = modVal / 2;

      for (let y = 0; y < canvas.height; y += cellSize) {
        for (let x = 0; x < canvas.width; x += cellSize) {
          for (let j = 0; j < cellSize; j += pixelSize) {
            for (let i = 0; i < cellSize; i += pixelSize) {
              const animatedJ = (j - offsetRef.current + cellSize) % cellSize;

              const baseExpression = (iMult * i + jMult * animatedJ) * exprMult;
              const sinWave =
                Math.sin((i * jMult + animatedJ * iMult) * sinWaveMultiplier) *
                  halfModVal +
                halfModVal;
              const expression = (baseExpression + sinWave) % modVal;

              if (expression / modVal < threshold) {
                if (monochromeControls.foreground === true) {
                  offscreenCtx.fillStyle = "white";
                } else {
                  offscreenCtx.fillStyle = `hsl(${hue}, 100%, ${foregroundLightness}%)`;
                }

                offscreenCtx.fillRect(x + i, y + j, pixelSize, pixelSize);
              }
            }
          }
        }
      }

      ctx.drawImage(offscreenCanvas, 0, 0);

      // Update texture
      if (cubeRef.current) {
        const texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        const materials = Array(6)
          .fill()
          .map(() => new THREE.MeshBasicMaterial({ map: texture }));
        cubeRef.current.material = materials;
      }

      // Update offset for animation
      if (speed > 0) {
        offsetRef.current = (offsetRef.current + speed) % cellSize;
      }
    }

    let animationFrameId;
    function animate() {
      drawPattern();
      animationFrameId = requestAnimationFrame(animate);
    }
    animate();

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [inputs, lightnessDelta]);

  return <Root ref={containerRef} />;
};

export default RainMachine;
