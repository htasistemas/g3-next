import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md border text-sm font-medium transition disabled:pointer-events-none disabled:opacity-60",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[var(--g3-primary-button)] text-white hover:bg-[var(--g3-primary-button-hover)]",
        outline:
          "border-[var(--g3-border)] bg-[var(--g3-card)] text-[var(--g3-foreground)] hover:bg-[var(--g3-primary-soft)]",
        danger:
          "border-transparent bg-[var(--g3-danger)] text-white hover:bg-red-700",
        destructive:
          "border-transparent bg-[var(--g3-danger)] text-white hover:bg-red-700",
        secondary:
          "border-[var(--g3-border)] bg-[var(--g3-card-soft)] text-[var(--g3-foreground)] hover:bg-[var(--g3-primary-soft)]",
        ghost:
          "border-transparent text-[var(--g3-foreground)] hover:bg-[var(--g3-primary-soft)]"
      },
      size: {
        default: "h-9 px-4",
        sm: "h-8 px-3 text-xs",
        lg: "h-10 px-5"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, type = "button", ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        type={type}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
