import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap text-base font-normal font-sans transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/40 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed select-none",
  {
    variants: {
      variant: {
        // DesignMD Primary: HubSpot Orange #FF4800, hover #C93700, active #9F2800
        default:
          "bg-brand-orange text-white hover:bg-brand-orange-dark active:bg-brand-orange-active shadow-none rounded-md",
        primary:
          "bg-brand-orange text-white hover:bg-brand-orange-dark active:bg-brand-orange-active shadow-none rounded-md",
        // DesignMD Secondary: 2px solid border, hover warm cream
        secondary:
          "bg-transparent text-neutral-primary border-2 border-neutral-primary hover:bg-neutral-cream active:bg-neutral-light rounded-md",
        // DesignMD Ghost: Teal text, soft blue/teal tint on hover
        ghost:
          "bg-transparent text-accent-teal hover:text-accent-teal-medium hover:bg-accent-teal-light/30 active:underline rounded-none",
        // Destructive / Error
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 rounded-md",
        // Outline subtle
        outline:
          "border border-border bg-white text-neutral-primary hover:bg-neutral-cream rounded-md",
      },
      size: {
        // DesignMD default button height is 52px with 16px 24px padding
        default: "h-[52px] px-6 py-4 text-base",
        sm: "h-9 px-3 text-sm rounded-md",
        lg: "h-[56px] px-8 text-lg rounded-md",
        icon: "h-10 w-10 p-2 rounded-md",
        "icon-sm": "h-8 w-8 p-1.5 rounded-md",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button };
export type { VariantProps };
