import * as React from "react";
import { cn } from "@/lib/utils";

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => {
  return (
    <select
      ref={ref}
      className={cn(
        "h-9 w-full rounded-md border border-slate-300 bg-slate-50 px-3 text-sm text-[var(--g3-foreground)] shadow-[inset_0_1px_3px_rgba(15,23,42,0.12),0_1px_2px_rgba(15,23,42,0.06)] outline-none ring-[var(--g3-active)] transition focus:border-[var(--g3-active)] focus:bg-white focus:ring-2 disabled:cursor-not-allowed disabled:opacity-70",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
});

Select.displayName = "Select";
