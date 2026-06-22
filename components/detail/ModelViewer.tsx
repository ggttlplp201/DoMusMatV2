"use client";

import { useEffect, useRef } from "react";

interface ModelViewerProps {
  src: string;
  alt: string;
}

export function ModelViewer({ src, alt }: ModelViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    import("@google/model-viewer");
  }, []);

  function handleReset() {
    const el = containerRef.current?.querySelector("model-viewer") as HTMLElement & {
      cameraOrbit: string;
      resetTurntableRotation?: () => void;
    } | null;
    if (el) {
      el.cameraOrbit = "0deg 75deg 105%";
    }
  }

  function handleFullscreen() {
    containerRef.current?.requestFullscreen?.();
  }

  return (
    <div
      ref={containerRef}
      className="relative rounded border border-aluminium bg-gradient-to-b from-white to-neutral-fill overflow-hidden"
    >
      {/* @ts-expect-error custom element */}
      <model-viewer
        src={src}
        alt={alt}
        camera-controls
        auto-rotate
        shadow-intensity="1"
        touch-action="pan-y"
        style={{ width: "100%", height: "480px", display: "block" }}
      />
      <div className="absolute bottom-3 right-3 flex gap-2">
        <button
          aria-label="Reset camera"
          onClick={handleReset}
          className="rounded border border-aluminium bg-white px-2.5 py-1 text-xs text-ink hover:bg-neutral-fill"
        >
          Reset
        </button>
        <button
          aria-label="Toggle fullscreen"
          onClick={handleFullscreen}
          className="rounded border border-aluminium bg-white px-2.5 py-1 text-xs text-ink hover:bg-neutral-fill"
        >
          Fullscreen
        </button>
      </div>
    </div>
  );
}
