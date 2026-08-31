import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-[opacity,transform,background-color,color] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 disabled:pointer-events-none disabled:opacity-40 active:scale-[0.98] select-none",
  {
    variants: {
      variant: {
        default: "bg-fg text-accent-fg hover:opacity-90",
        secondary:
          "bg-surface-2 text-fg border border-border hover:border-border-strong",
        ghost: "bg-transparent text-fg hover:bg-surface-2",
        accent: "bg-accent text-accent-fg hover:opacity-90",
      },
      size: {
        default: "h-11 min-h-11 px-5 text-sm rounded-md",
        lg: "h-12 min-h-12 px-6 text-base rounded-lg",
        icon: "size-11 min-h-11 rounded-md",
        sm: "h-9 min-h-9 px-3 text-sm rounded-sm",
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

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";
