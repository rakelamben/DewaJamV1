import {
  useRef,
  useState,
  type HTMLAttributes,
  type ReactNode,
  type MouseEvent,
} from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

interface CardSpotlightProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  spotlightColor?: string;
  className?: string;
}

export function CardSpotlight({
  children,
  spotlightColor = "rgba(249, 115, 22, 0.12)",
  className,
  ...props
}: CardSpotlightProps) {
  const divRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!divRef.current) return;

    const div = divRef.current;
    const rect = div.getBoundingClientRect();

    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleFocus = () => {
    setOpacity(1);
  };

  const handleBlur = () => {
    setOpacity(0);
  };

  const handleMouseEnter = () => {
    setOpacity(1);
  };

  const handleMouseLeave = () => {
    setOpacity(0);
  };

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn(
        "relative rounded-xl border border-gray-200 bg-white overflow-hidden transition-all duration-300",
        className,
      )}
      {...props}
    >
      <motion.div
        className="pointer-events-none absolute -inset-px opacity-0 transition duration-300"
        animate={{ opacity }}
        style={{
          background: `radial-gradient(400px circle at ${position.x}px ${position.y}px, ${spotlightColor}, transparent 70%)`,
        }}
      />
      {children}
    </div>
  );
}
