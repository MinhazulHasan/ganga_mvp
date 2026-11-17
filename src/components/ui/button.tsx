import * as React from "react";
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap font-medium tracking-[-0.01em] transition-[background-color,color,box-shadow,transform,opacity] duration-200 ease-out outline-none focus-visible:ring-[3px] focus-visible:ring-ring/60 disabled:pointer-events-none disabled:opacity-45 active:scale-[0.98] [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-soft hover:bg-primary/90",
        secondary: "bg-surface-2 text-foreground hover:bg-surface-3",
        outline: "border border-border-strong bg-surface text-foreground shadow-soft hover:bg-surface-2",
        ghost: "text-foreground hover:bg-surface-2",
        subtle: "text-muted hover:bg-surface-2 hover:text-foreground",
        danger: "bg-emergency text-white shadow-soft hover:bg-emergency/90 dark:text-[#21222c]",
        link: "h-auto px-0 text-foreground underline-offset-4 hover:underline",
      },
      size: {
        xs: "h-7 rounded-[9px] px-2.5 text-xs",
        sm: "h-8 rounded-[10px] px-3 text-[13px]",
        md: "h-9.5 rounded-[12px] px-4 text-sm",
        lg: "h-11 rounded-[14px] px-5 text-[15px]",
        xl: "h-13 rounded-[16px] px-6 text-base",
        icon: "size-9 rounded-[11px]",
        "icon-sm": "size-8 rounded-[10px]",
      },
    },
    defaultVariants: { variant: "default", size: "md" },
  }
);

export interface ButtonProps
  extends React.ComponentProps<"button">,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  return <Comp data-slot="button" className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export { Button, buttonVariants };
