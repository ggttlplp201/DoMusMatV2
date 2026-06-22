"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

type AnimatedButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  children: React.ReactNode;
};

export function AnimatedButton({
  children,
  onClick,
  className,
  disabled,
  type = "button",
  ...rest
}: AnimatedButtonProps) {
  const btnRef = useRef<HTMLButtonElement>(null);

  const { contextSafe } = useGSAP({ scope: btnRef });

  const handleClick = contextSafe((e: React.MouseEvent<HTMLButtonElement>) => {
    const el = btnRef.current;
    if (el) {
      const reduced =
        typeof window !== "undefined" &&
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (!reduced) {
        gsap.fromTo(
          el,
          { scale: 1 },
          { scale: 0.93, duration: 0.08, yoyo: true, repeat: 1, ease: "power2.out" }
        );
      }
    }
    onClick?.(e);
  });

  return (
    <button
      ref={btnRef}
      type={type}
      disabled={disabled}
      className={className}
      onClick={handleClick}
      {...rest}
    >
      {children}
    </button>
  );
}
