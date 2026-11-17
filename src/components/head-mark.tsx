"use client";

import { useEffect, useRef } from "react";
import { HEAD_BITS, HEAD_CELLS } from "@/lib/head-bits";

/**
 * The homepage head, painted once at rest. Same 110-cell bitmap as
 * rob-gill.co.uk, shown at its 220px size. No cloud, wobble, or hover.
 * Dark stays black on white. Yellow uses the theme ink on #F8D201.
 */
function palette(): [string, string] {
  const theme = document.documentElement.getAttribute("data-theme");
  if (theme === "yellow") return ["#F8D201", "#000A73"];
  return ["#fff", "#000"];
}

function paint(canvas: HTMLCanvasElement) {
  const dpr = Math.min(2, Math.max(1, Math.round(window.devicePixelRatio || 1)));
  const size = HEAD_CELLS * dpr;
  if (canvas.width !== size || canvas.height !== size) {
    canvas.width = size;
    canvas.height = size;
  }
  const context = canvas.getContext("2d");
  if (!context) return;
  context.imageSmoothingEnabled = false;
  const raw = Uint8Array.from(atob(HEAD_BITS), (character) => character.charCodeAt(0));
  const [paper, ink] = palette();
  context.fillStyle = paper;
  context.fillRect(0, 0, size, size);
  context.fillStyle = ink;
  for (let y = 0; y < HEAD_CELLS; y += 1) {
    for (let x = 0; x < HEAD_CELLS; x += 1) {
      const index = y * HEAD_CELLS + x;
      const on = (raw[index >> 3] >> (7 - (index & 7))) & 1;
      if (!on) continue;
      context.fillRect(x * dpr, y * dpr, dpr, dpr);
    }
  }
}

export function HeadMark() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const draw = () => paint(canvas);
    draw();
    const observer = new MutationObserver(draw);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  return (
    <a className="head-link" href="https://rob-gill.co.uk" aria-label="Rob Gill">
      <canvas ref={canvasRef} className="head-mark" width={HEAD_CELLS} height={HEAD_CELLS} aria-hidden="true" />
    </a>
  );
}
