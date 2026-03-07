import * as React from "react";
import { cn } from "@/lib/utils";

type CheckboxProps = React.InputHTMLAttributes<HTMLInputElement>;

export function Checkbox({ className, ...props }: CheckboxProps) {
  return (
    <input
      type="checkbox"
      className={cn(
        "h-4 w-4 rounded border-[var(--g3-border)] text-[var(--g3-active)] focus:ring-[var(--g3-active)]",
        className
      )}
      {...props}
    />
  );
}
