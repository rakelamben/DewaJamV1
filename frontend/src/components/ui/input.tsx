import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-[44px] w-full rounded-sm border border-black/40 bg-white px-4 py-2 text-base text-neutral-primary transition-colors",
          "placeholder:text-neutral-secondary placeholder:italic",
          "focus-visible:outline-none focus-visible:border-brand-orange focus-visible:ring-2 focus-visible:ring-brand-orange/20",
          "disabled:cursor-not-allowed disabled:bg-neutral-light disabled:text-neutral-secondary disabled:border-border",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
