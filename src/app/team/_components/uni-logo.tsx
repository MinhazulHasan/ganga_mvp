import Image from "next/image";
import { cn } from "@/lib/utils";

/** University logo on a white tile so it reads in both themes. */
export function UniLogo({ src, name, size = 32, className }: { src: string; name: string; size?: number; className?: string }) {
  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center rounded-[10px] bg-white p-[3px] ring-1 ring-black/5", className)}
      style={{ width: size, height: size }}
    >
      <Image src={src} alt={`${name} logo`} width={size * 2} height={size * 2} className="size-full object-contain" />
    </span>
  );
}
