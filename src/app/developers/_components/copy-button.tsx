"use client";

import * as React from "react";
import { CheckIcon, CopyIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export async function copyText(text: string, message: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(message);
    return true;
  } catch {
    toast.error("Copy failed");
    return false;
  }
}

/** Small copy button with a brief "copied" state and a toast. */
export function CopyButton({
  text,
  message,
  label = "Copy",
  variant = "secondary",
  size = "sm",
}: {
  text: string;
  message: string;
  label?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
}) {
  const [done, setDone] = React.useState(false);
  React.useEffect(() => {
    if (!done) return;
    const id = setTimeout(() => setDone(false), 1600);
    return () => clearTimeout(id);
  }, [done]);
  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={async () => {
        if (await copyText(text, message)) setDone(true);
      }}
    >
      {done ? <CheckIcon aria-hidden /> : <CopyIcon aria-hidden />}
      {done ? "Copied" : label}
    </Button>
  );
}
