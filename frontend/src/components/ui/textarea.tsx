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
        "min-h-24 w-full rounded-md border border-[var(--g3-border)] bg-[var(--g3-card)] px-3 py-2 text-sm text-[var(--g3-foreground)] outline-none ring-[var(--g3-active)] transition placeholder:text-[var(--g3-muted)] focus:ring-2",
        className
      )}
      {...props}
    />
  );
});

Textarea.displayName = "Textarea";
