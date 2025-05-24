import styled from "styled-components";
import { useEffect, useRef } from "react";

const Root = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  height: calc(100% - 4rem);
  width: calc(100% - 4rem);
  padding: 2rem;
  background-color: ${(props) => props.theme.background};
  color: ${(props) => props.theme.text};
  font-family: ${(props) => props.theme.fontFamily};
  font-size: 1.25rem;
  position: relative;
`;

const Canvas = styled.canvas`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: #f4ff7d;
`;

export default function BlobMachine() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      console.error("Canvas ref is null");
      return;
    }

    const updateCanvasSize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      console.log("Canvas size:", canvas.width, canvas.height);
    };

    updateCanvasSize();
    window.addEventListener("resize", updateCanvasSize);

    const gl = canvas.getContext("webgl");
    if (!gl) {
      console.error("WebGL not supported");
      return;
    }

    console.log("WebGL context created successfully");

    // Shader sources
    const vertexShaderSource = `
      attribute vec4 a_position;
      void main() {
        gl_Position = a_position;
      }`;

    const fragmentShaderSource = `
      precision highp float;
      #define MAX_METABALLS 100
      uniform vec2 u_resolution;
      uniform float u_time;
      uniform int u_count;
      uniform vec3 u_metaballs[MAX_METABALLS];

      void main() {
        vec2 uv = gl_FragCoord.xy / u_resolution;
        float fieldBlue = 0.0;
        float fieldPink = 0.0;
        vec2 distortion = vec2(0.0);
        float totalPinkInfluence = 0.0;

        // First pass: calculate pink field and distortion
        for (int i = 15; i < MAX_METABALLS; ++i) {
          if (i >= u_count) break;
          vec2 pos = u_metaballs[i].xy;
          float r = u_metaballs[i].z;
          float dx = uv.x - pos.x;
          float dy = uv.y - pos.y;
          float d = max(dx * dx + dy * dy, 0.0001);
          float influence = (r * r) / d;
          fieldPink += influence;

          // Calculate repulsion (inverted distortion)
          vec2 dir = normalize(vec2(dx, dy));
          // Push outward from pink blob center
          distortion -= dir * influence * 0.12; // Reduced from 0.2
          totalPinkInfluence += influence;
        }

        // Normalize distortion
        if (totalPinkInfluence > 0.0) {
          distortion /= totalPinkInfluence;
        }

        // Apply distortion to UV coordinates
        vec2 distortedUV = uv;
        if (fieldPink > 0.3) {
          // Add some turbulence to the distortion
          float turbulence = sin(uv.x * 10.0 + u_time) * 0.08 + 
                           sin(uv.y * 8.0 + u_time * 0.8) * 0.08; // Reduced from 0.1
          distortedUV += distortion * min(fieldPink * 0.6, 1.0) + // Reduced from 0.8
                        vec2(turbulence, turbulence);
        }

        // Second pass: calculate blue field with distorted coordinates
        for (int i = 0; i < 15; ++i) {
          if (i >= u_count) break;
          vec2 pos = u_metaballs[i].xy;
          float r = u_metaballs[i].z;
          float dx = distortedUV.x - pos.x;
          float dy = distortedUV.y - pos.y;
          float d = max(dx * dx + dy * dy, 0.0001);
          fieldBlue += (r * r) / d;
        }

        float threshold = 1.0;
        if (fieldPink > threshold) {
          gl_FragColor = vec4(1.0, 0.4078, 0.6274, 1.0); // #FF68A0
        } else if (fieldBlue > threshold) {
          gl_FragColor = vec4(0.376, 0.780, 1.0, 1.0); // #60C7FF
        } else {
          discard;
        }
      }`;

    // Shader compilation
    function createShader(gl, type, source) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error("Shader compile error:", gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    }

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(
      gl,
      gl.FRAGMENT_SHADER,
      fragmentShaderSource
    );

    if (!vertexShader || !fragmentShader) {
      throw new Error("Shader compilation failed.");
    }

    // Program linking
    function createProgram(gl, vShader, fShader) {
      const program = gl.createProgram();
      if (!program) return null;
      gl.attachShader(program, vShader);
      gl.attachShader(program, fShader);
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error("Program link error:", gl.getProgramInfoLog(program));
        return null;
      }
      return program;
    }

    const program = createProgram(gl, vertexShader, fragmentShader);
    if (!program) throw new Error("WebGL program linking failed");

    // Full screen quad
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );

    const aPosition = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(aPosition);
    gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

    // Uniforms
    const uResolution = gl.getUniformLocation(program, "u_resolution");
    const uTime = gl.getUniformLocation(program, "u_time");
    const uCount = gl.getUniformLocation(program, "u_count");
    const uMetaballs = gl.getUniformLocation(program, "u_metaballs");

    // Metaballs setup
    const metaballs = [];
    for (let i = 0; i < 15; i++) {
      metaballs.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: 50 + Math.random() * 30,
        dx: (Math.random() - 0.5) * 2,
        dy: (Math.random() - 0.5) * 2
      });
    }
    for (let i = 0; i < 30; i++) {
      metaballs.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: 20 + Math.random() * 15,
        dx: (Math.random() - 0.5) * 2,
        dy: (Math.random() - 0.5) * 2
      });
    }

    // Render loop
    function render(time) {
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clear(gl.COLOR_BUFFER_BIT);

      for (const b of metaballs) {
        b.x += b.dx;
        b.y += b.dy;
        if (b.x < 0 || b.x > canvas.width) b.dx *= -1;
        if (b.y < 0 || b.y > canvas.height) b.dy *= -1;
      }

      const flattened = [];
      for (const b of metaballs) {
        flattened.push(
          b.x / canvas.width,
          b.y / canvas.height,
          b.r / Math.max(canvas.width, canvas.height)
        );
      }

      gl.useProgram(program);
      gl.uniform2f(uResolution, canvas.width, canvas.height);
      gl.uniform1f(uTime, time * 0.001);
      gl.uniform1i(uCount, metaballs.length);
      gl.uniform3fv(uMetaballs, new Float32Array(flattened));

      gl.drawArrays(gl.TRIANGLES, 0, 6);
      requestAnimationFrame(render);
    }

    render(0);

    return () => {
      window.removeEventListener("resize", updateCanvasSize);
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
    };
  }, []);

  return (
    <Root>
      <Canvas ref={canvasRef} />
    </Root>
  );
}
