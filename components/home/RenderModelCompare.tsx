"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useCallback } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { useT } from "@/state/locale";

gsap.registerPlugin(useGSAP);

interface RenderModelCompareProps {
  /** URL of the render image (base layer) */
  imageSrc: string;
  /** Path to the GLB model file */
  modelSrc: string;
  /** Alt text for the render image */
  imageAlt?: string;
}

/**
 * A draggable before/after comparison slider.
 * Left side = render image; right side = 3D model (model-viewer).
 * The divider `pos` (0–100) controls how much of the render is visible.
 * At pos=0 model is fully visible; at pos=100 render is fully visible.
 */
export function RenderModelCompare({
  imageSrc,
  modelSrc,
  imageAlt = "Product render",
}: RenderModelCompareProps) {
  const t = useT();
  const [pos, setPos] = useState(55); // render occupies left 55% by default
  const [dragging, setDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);

  // Track whether the user has interacted — used to cancel nudge + fade hint
  const hasInteracted = useRef(false);
  const nudgeTweenRef = useRef<gsap.core.Tween | null>(null);

  // Load model-viewer web component client-side only
  useEffect(() => {
    import("@google/model-viewer");
  }, []);

  // Detect prefers-reduced-motion
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Proxy object so GSAP can tween the pos state
  const posProxy = useRef({ value: 55 });

  // Cancel hint + stop nudge on first interaction
  const cancelHint = useCallback(() => {
    if (hasInteracted.current) return;
    hasInteracted.current = true;

    // Kill the nudge tween
    if (nudgeTweenRef.current) {
      nudgeTweenRef.current.kill();
      nudgeTweenRef.current = null;
    }

    // Fade out the hint pill
    if (hintRef.current) {
      gsap.to(hintRef.current, { opacity: 0, duration: 0.25, ease: "power1.out" });
    }
  }, []);

  // GSAP nudge animation on mount
  useGSAP(
    () => {
      if (reducedMotion) return;

      // Small delay so the page settles first
      const delayTimer = window.setTimeout(() => {
        if (hasInteracted.current) return;

        const tween = gsap.to(posProxy.current, {
          value: 55, // dummy; we use keyframes below
          duration: 0,
          onComplete: () => {},
        });
        tween.kill();

        // Keyframe tween: 55 → 64 → 40 → 55
        const t = gsap.timeline({
          onUpdate: () => {
            if (hasInteracted.current) return;
            setPos(posProxy.current.value);
          },
          onComplete: () => {
            nudgeTweenRef.current = null;
            // Auto-fade hint after animation completes + 1.5s delay
            if (!hasInteracted.current && hintRef.current) {
              gsap.to(hintRef.current, {
                opacity: 0,
                duration: 0.4,
                delay: 1.5,
                ease: "power1.out",
              });
            }
          },
        });

        posProxy.current.value = 55;

        t.to(posProxy.current, { value: 64, duration: 0.35, ease: "power2.out" })
          .to(posProxy.current, { value: 40, duration: 0.5, ease: "power2.inOut" })
          .to(posProxy.current, { value: 55, duration: 0.35, ease: "power2.in" });

        nudgeTweenRef.current = t as unknown as gsap.core.Tween;
      }, 800);

      return () => {
        window.clearTimeout(delayTimer);
        nudgeTweenRef.current?.kill();
      };
    },
    { dependencies: [reducedMotion], scope: containerRef }
  );

  const updatePosFromPointer = useCallback((clientX: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const pct = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
    setPos(pct);
    posProxy.current.value = pct;
  }, []);

  // Pointer events on the handle
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      cancelHint();
      e.currentTarget.setPointerCapture(e.pointerId);
      setDragging(true);
      updatePosFromPointer(e.clientX);
    },
    [updatePosFromPointer, cancelHint]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!dragging) return;
      updatePosFromPointer(e.clientX);
    },
    [dragging, updatePosFromPointer]
  );

  const handlePointerUp = useCallback(() => {
    setDragging(false);
  }, []);

  // Keyboard a11y
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        cancelHint();
        setPos((p) => {
          const next = Math.max(0, p - 2);
          posProxy.current.value = next;
          return next;
        });
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        cancelHint();
        setPos((p) => {
          const next = Math.min(100, p + 2);
          posProxy.current.value = next;
          return next;
        });
      }
    },
    [cancelHint]
  );

  const renderLabel = t("detail.tab.render.label") || "渲染图 · RENDER";
  const modelLabel = t("detail.tab.model.label") || "3D 模型";
  const compareHint = t("home.compareHint") || "Drag to compare";

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        aspectRatio: "4/3",
        background: "#F6F5F0",
        border: "1px solid #E6E5DE",
        borderRadius: "14px",
        overflow: "hidden",
        userSelect: "none",
        touchAction: "none",
        cursor: dragging ? "ew-resize" : "default",
      }}
    >
      {/* Base layer: render image (full width) */}
      <Image
        src={imageSrc}
        alt={imageAlt}
        fill
        style={{ objectFit: "cover", pointerEvents: "none" }}
        sizes="(max-width: 1024px) 100vw, 50vw"
        priority
      />

      {/* Reveal layer: 3D model, clipped to show from pos% to 100% */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          clipPath: `inset(0 0 0 ${pos}%)`,
          background: "#F6F5F0",
        }}
      >
        {/* @ts-expect-error custom element */}
        <model-viewer
          src={modelSrc}
          alt="High Bay LED 3D model"
          {...(reducedMotion ? {} : { "auto-rotate": true })}
          shadow-intensity="0.6"
          style={{
            width: "100%",
            height: "100%",
            background: "#F6F5F0",
            display: "block",
          }}
        />
      </div>

      {/* Frosted-glass seam band — sits above the image/model layers, below the handle */}
      <div
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: `${pos}%`,
          width: "36px",
          transform: "translateX(-50%)",
          pointerEvents: "none",
          zIndex: 6,
          /* Soft translucent gradient that blends the two sides */
          background:
            "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.28) 50%, transparent 100%)",
          /* Frosted blur — falls back gracefully where unsupported */
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          /* Subtle 1px inner highlight on each edge for a glass-edge feel */
          boxShadow:
            "inset 1px 0 0 rgba(255,255,255,0.45), inset -1px 0 0 rgba(255,255,255,0.45)",
        }}
        aria-hidden="true"
      />

      {/* Divider line */}
      <div
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: `${pos}%`,
          width: "2px",
          background: "rgba(255,255,255,0.9)",
          transform: "translateX(-50%)",
          pointerEvents: "none",
          zIndex: 7,
        }}
      />

      {/* Grab handle — draggable, focusable */}
      <div
        role="slider"
        aria-label="Drag to compare render and 3D model"
        aria-valuenow={Math.round(pos)}
        aria-valuemin={0}
        aria-valuemax={100}
        tabIndex={0}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onKeyDown={handleKeyDown}
        style={{
          position: "absolute",
          top: "50%",
          left: `${pos}%`,
          transform: "translate(-50%, -50%)",
          width: "40px",
          height: "40px",
          borderRadius: "50%",
          background: "#fff",
          border: "1.5px solid #E6E5DE",
          boxShadow: "0 2px 12px rgba(0,0,0,0.18)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "ew-resize",
          zIndex: 10,
          outline: "none",
        }}
        onFocus={(e) => {
          e.currentTarget.style.boxShadow = "0 0 0 3px rgba(218,30,40,0.35), 0 2px 12px rgba(0,0,0,0.18)";
        }}
        onBlur={(e) => {
          e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.18)";
        }}
      >
        <svg width="18" height="14" viewBox="0 0 18 14" fill="none" aria-hidden="true">
          <path d="M5 7H1m0 0 3-3M1 7l3 3" stroke="#17181C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M13 7h4m0 0-3-3m3 3-3 3" stroke="#17181C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      {/* Drag hint pill — fades out after nudge completes or first interaction */}
      <div
        ref={hintRef}
        className="font-mono"
        style={{
          position: "absolute",
          bottom: "48px",
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          alignItems: "center",
          gap: "5px",
          fontSize: "10.5px",
          letterSpacing: "0.06em",
          color: "#fff",
          background: "rgba(23,24,28,0.62)",
          backdropFilter: "blur(6px)",
          padding: "5px 10px",
          borderRadius: "20px",
          pointerEvents: "none",
          zIndex: 8,
          whiteSpace: "nowrap",
        }}
        aria-hidden="true"
      >
        {/* ⟷ icon */}
        <svg width="14" height="10" viewBox="0 0 14 10" fill="none" aria-hidden="true">
          <path d="M3.5 5H1m0 0 2-2M1 5l2 2" stroke="#fff" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M10.5 5H13m0 0-2-2m2 2-2 2" stroke="#fff" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        {compareHint}
      </div>

      {/* Corner pill: render label (left side) */}
      <div
        className="font-mono"
        style={{
          position: "absolute",
          left: "14px",
          bottom: "14px",
          fontSize: "10.5px",
          letterSpacing: "0.07em",
          color: "#fff",
          background: "rgba(0,0,0,0.5)",
          padding: "4px 9px",
          borderRadius: "4px",
          backdropFilter: "blur(4px)",
          pointerEvents: "none",
          zIndex: 5,
          opacity: pos < 15 ? 0 : 1,
          transition: "opacity 0.2s",
        }}
      >
        {renderLabel}
      </div>

      {/* Corner pill: model label (right side) */}
      <div
        className="font-mono"
        style={{
          position: "absolute",
          right: "14px",
          bottom: "14px",
          fontSize: "10.5px",
          letterSpacing: "0.07em",
          color: "#fff",
          background: "rgba(0,0,0,0.5)",
          padding: "4px 9px",
          borderRadius: "4px",
          backdropFilter: "blur(4px)",
          pointerEvents: "none",
          zIndex: 5,
          opacity: pos > 85 ? 0 : 1,
          transition: "opacity 0.2s",
        }}
      >
        {modelLabel}
      </div>
    </div>
  );
}
