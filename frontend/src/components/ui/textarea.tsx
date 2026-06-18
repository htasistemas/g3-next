import * as React from "react";
import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={cn(
        "min-h-24 w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-[var(--g3-foreground)] shadow-[inset_0_1px_3px_rgba(15,23,42,0.12),0_1px_2px_rgba(15,23,42,0.06)] outline-none ring-[var(--g3-active)] transition placeholder:text-[var(--g3-muted)] focus:border-[var(--g3-active)] focus:bg-white focus:ring-2 disabled:cursor-not-allowed disabled:opacity-70",
        className
      )}
      {...props}
    />
  );
});

Textarea.displayName = "Textarea";
