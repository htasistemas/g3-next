import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none ring-emerald-600 transition placeholder:text-slate-400 focus:ring-2",
          className
        )}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";
