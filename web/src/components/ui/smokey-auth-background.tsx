"use client";

import { useEffect, useRef } from "react";

const vertex = `attribute vec2 position;
void main() { gl_Position = vec4(position, 0.0, 1.0); }`;

const fragment = `precision mediump float;
uniform vec2 resolution;
uniform float time;
uniform vec2 pointer;
void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * resolution) / min(resolution.x, resolution.y);
  vec2 cursor = (pointer / resolution - 0.5) * 1.7;
  vec2 p = uv;
  float t = time * 0.24;
  for (int i = 1; i < 6; ++i) {
    float n = float(i);
    p.x += 0.17/n * cos(n * 1.6 * p.y + t + cursor.x);
    p.y += 0.17/n * sin(n * 1.5 * p.x - t + cursor.y);
  }
  float wave = sin(p.x * 3.8 + p.y * 2.7 + t) * 0.5 + 0.5;
  float halo = pow(max(0.0, 1.0 - length(p - vec2(0.4, 0.0))), 2.0);
  float strength = smoothstep(0.15, 0.92, wave) * 0.21 + halo * 0.17;
  vec3 base = vec3(0.046, 0.094, 0.22);
  vec3 accent = vec3(0.32, 0.39, 0.82);
  gl_FragColor = vec4(mix(base, accent, clamp(strength, 0.0, 0.62)), 1.0);
}`;

function makeShader(gl: WebGLRenderingContext, kind: number, source: string) {
  const shader = gl.createShader(kind);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export function SmokeyAuthBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const gl = canvas.getContext("webgl", { alpha: false, antialias: false });
    if (!gl) return;
    const vs = makeShader(gl, gl.VERTEX_SHADER, vertex);
    const fs = makeShader(gl, gl.FRAGMENT_SHADER, fragment);
    if (!vs || !fs) return;
    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vs); gl.attachShader(program, fs); gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program); gl.deleteShader(vs); gl.deleteShader(fs); return;
    }
    const buffer = gl.createBuffer();
    if (!buffer) { gl.deleteProgram(program); gl.deleteShader(vs); gl.deleteShader(fs); return; }
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);
    gl.useProgram(program);
    const position = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    const resolution = gl.getUniformLocation(program, "resolution");
    const time = gl.getUniformLocation(program, "time");
    const pointer = gl.getUniformLocation(program, "pointer");
    const cursor = { x: 0, y: 0 };
    let raf = 0;
    let visible = !document.hidden;
    let width = 0, height = 0;
    const started = performance.now();
    const move = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      cursor.x = e.clientX - rect.left;
      cursor.y = rect.height - (e.clientY - rect.top);
    };
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = Math.max(1, Math.floor(rect.width * dpr));
      const h = Math.max(1, Math.floor(rect.height * dpr));
      if (w !== width || h !== height) {
        width = w; height = h; canvas.width = w; canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
    };
    const render = (now: number) => {
      if (!visible) return;
      resize();
      gl.uniform2f(resolution, width, height);
      gl.uniform1f(time, (now - started) / 1000);
      gl.uniform2f(pointer, cursor.x * (width / (canvas.clientWidth || 1)), cursor.y * (height / (canvas.clientHeight || 1)));
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      raf = requestAnimationFrame(render);
    };
    const onVisibility = () => {
      visible = !document.hidden;
      cancelAnimationFrame(raf);
      if (visible) raf = requestAnimationFrame(render);
    };
    const onLost = (event: Event) => { event.preventDefault(); visible = false; cancelAnimationFrame(raf); };
    // Browsers may restore a new GL context with invalidated buffers/programs.
    // Keep the CSS gradient fallback rather than attempting to reuse stale GPU resources.
    const onRestore = () => { visible = false; };
    window.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    canvas.addEventListener("webglcontextlost", onLost);
    canvas.addEventListener("webglcontextrestored", onRestore);
    raf = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", move);
      document.removeEventListener("visibilitychange", onVisibility);
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestore);
      gl.bindBuffer(gl.ARRAY_BUFFER, null);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vs); gl.deleteShader(fs);
    };
  }, []);
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden bg-[radial-gradient(ellipse_at_70%_10%,#334B99_0%,#0B1B3A_55%,#071229_100%)]">
      <canvas ref={canvasRef} className="h-full w-full opacity-90" />
      <div className="absolute inset-0 bg-[linear-gradient(105deg,rgba(5,15,34,.28),transparent_65%)]" />
    </div>
  );
}
