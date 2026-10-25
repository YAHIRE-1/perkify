import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "cn";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 font-semibold text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 gap-1",
  {
    variants: {
      variant: {
        default:
          "border-success/30 bg-success/10 text-success hover:bg-success/20",
        secondary:
          "border-secondary-foreground/20 bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20",
        success:
          "border-green-500/30 bg-green-500/10 text-green-700 hover:bg-green-500/20 dark:text-green-400 gap-1",
        blue: "border-brand/30 bg-brand/10 text-brand hover:bg-brand/20",
        warning:
          "border-amber-500/30 bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 dark:text-amber-400",
        outline: "text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };