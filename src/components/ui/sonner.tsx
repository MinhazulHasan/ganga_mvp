"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

function Toaster(props: ToasterProps) {
  const { resolvedTheme } = useTheme();
  return (
    <Sonner
      theme={(resolvedTheme as ToasterProps["theme"]) ?? "light"}
      position="bottom-right"
      gap={10}
      toastOptions={{
        classNames: {
          toast:
            "!rounded-[16px] !border !border-border !bg-surface/95 !text-foreground !shadow-float !backdrop-blur-xl !font-sans",
          description: "!text-muted",
          actionButton: "!bg-primary !text-primary-foreground !rounded-[8px]",
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
