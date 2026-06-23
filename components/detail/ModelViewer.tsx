"use client";

import { useEffect, useRef } from "react";
import { useT } from "@/state/locale";

interface ModelViewerProps {
  src: string;
  alt: string;
}

export function ModelViewer({ src, alt }: ModelViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const t = useT();

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
      {/* SAMPLE overlay — tiled diagonal watermark, pointer-events-none so orbit/zoom/click pass through */}
      <div
        aria-hidden="true"
        className="absolute inset-0 z-10 pointer-events-none"
        style={(() => {
          const word = "SAMPLE"; // watermark stays English in all locales
          const tile = `<svg xmlns='http://www.w3.org/2000/svg' width='240' height='160'><text x='20' y='110' transform='rotate(-30 20 110)' font-family='Open Sans, system-ui, sans-serif' font-weight='700' font-size='26' letter-spacing='3' fill='rgba(20,20,20,0.08)'>${word}</text></svg>`;
          return {
            backgroundImage: `url("data:image/svg+xml;utf8,${encodeURIComponent(tile)}")`,
            backgroundRepeat: "repeat",
          };
        })()}
      />
      <div className="absolute bottom-3 right-3 flex gap-2 z-20">
        <button
          aria-label={t("viewer.reset")}
          onClick={handleReset}
          className="rounded border border-aluminium bg-white px-2.5 py-1 text-xs text-ink hover:bg-neutral-fill"
        >
          {t("viewer.reset")}
        </button>
        <button
          aria-label={t("viewer.fullscreen")}
          onClick={handleFullscreen}
          className="rounded border border-aluminium bg-white px-2.5 py-1 text-xs text-ink hover:bg-neutral-fill"
        >
          {t("viewer.fullscreen")}
        </button>
      </div>
    </div>
  );
}
