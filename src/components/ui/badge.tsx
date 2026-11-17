import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-medium tracking-[-0.005em] [&_svg]:size-3.5 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        neutral: "bg-surface-2 text-muted",
        outline: "border border-border-strong text-muted",
        solid: "bg-primary text-primary-foreground",
        brand: "bg-brand-soft text-brand",
        normal: "bg-normal-soft text-normal",
        watch: "bg-watch-soft text-watch",
        warning: "bg-warning-soft text-warning",
        emergency: "bg-emergency-soft text-emergency",
        built: "bg-built-soft text-built",
        simulated: "bg-simulated-soft text-simulated",
        planned: "border border-dashed border-border-strong bg-planned-soft text-planned",
      },
      size: {
        sm: "h-5 px-2 text-[11px]",
        md: "h-6 px-2.5 text-xs",
        lg: "h-7 px-3 text-[13px]",
      },
    },
    defaultVariants: { variant: "neutral", size: "md" },
  }
);

export interface BadgeProps extends React.ComponentProps<"span">, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return <span data-slot="badge" className={cn(badgeVariants({ variant, size }), className)} {...props} />;
}

export { Badge, badgeVariants };
