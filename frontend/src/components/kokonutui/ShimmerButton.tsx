import type { ButtonHTMLAttributes, ReactNode, CSSProperties } from "react";
import { cn } from "@/lib/utils";

interface ShimmerButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  shimmerColor?: string;
  shimmerSize?: string;
  borderRadius?: string;
  shimmerDuration?: string;
  background?: string;
  className?: string;
  children?: ReactNode;
}

export function ShimmerButton({
  shimmerColor = "#ffffff",
  shimmerSize = "0.08em",
  shimmerDuration = "2.5s",
  borderRadius = "0.625rem",
  background = "rgba(17, 24, 39, 1)",
  className,
  children,
  ...props
}: ShimmerButtonProps) {
  return (
    <button
      style={
        {
          "--spread": "90deg",
          "--shimmer-color": shimmerColor,
          "--radius": borderRadius,
          "--speed": shimmerDuration,
          "--cut": shimmerSize,
          "--bg": background,
        } as CSSProperties
      }
      className={cn(
        "group relative z-0 flex cursor-pointer items-center justify-center overflow-hidden whitespace-nowrap px-5 py-2.5 text-white [background:var(--bg)] [border-radius:var(--radius)] transition-all duration-300 active:scale-95 hover:shadow-lg",
        className,
      )}
      {...props}
    >
      {/* Spark container */}
      <div className="-z-30 blur-[2px] absolute inset-0 overflow-visible [container-type:size]">
        <div className="absolute inset-0 h-[100cqh] animate-spin [aspect-ratio:1] [border-radius:0] [mask:none]">
          <div className="animate-shimmer-slide absolute -inset-full w-auto rotate-0 [background:conic-gradient(from_0deg,transparent_0_340deg,var(--shimmer-color)_360deg)] [translate:0_0]" />
        </div>
      </div>
      {/* Content */}
      <span className="relative z-10 flex items-center gap-2 text-sm font-bold tracking-tight">
        {children}
      </span>
      {/* Backdrop */}
      <div className="absolute inset-px -z-20 [background:var(--bg)] [border-radius:calc(var(--radius)-1px)] transition-colors duration-300 group-hover:bg-neutral-800" />
    </button>
  );
}
