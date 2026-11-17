import * as React from "react";
import { cn } from "@/lib/utils";
import { Container } from "./container";
import { SectionHimalaya } from "@/components/brand/himalaya-backdrop";

interface SectionProps extends Omit<React.ComponentProps<"section">, "title"> {
  eyebrow?: React.ReactNode;
  title?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  /** "muted" puts the section on the grouped background */
  tone?: "default" | "muted";
  containerClassName?: string;
}

/** Standard page section: consistent vertical rhythm, optional header. */
export function Section({ eyebrow, title, description, actions, tone = "default", className, containerClassName, children, ...props }: SectionProps) {
  return (
    <section
      className={cn(
        "py-16 sm:py-24",
        // muted: grey background, with the Himalaya drawn on top of the grey (clipped to this section)
        tone === "muted" && "relative isolate bg-surface-2/60 [clip-path:inset(0)]",
        className
      )}
      {...props}
    >
      {tone === "muted" && <SectionHimalaya />}
      <Container className={containerClassName}>
        {(eyebrow || title || description || actions) && (
          <div className="mb-10 flex flex-col gap-5 sm:mb-12 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              {eyebrow && <p className="mb-3 text-[13px] font-semibold uppercase tracking-[0.14em] text-brand">{eyebrow}</p>}
              {title && <h2 className="text-[32px] font-semibold leading-[1.08] tracking-[-0.03em] sm:text-[40px]">{title}</h2>}
              {description && <p className="mt-4 text-[17px] leading-relaxed text-muted">{description}</p>}
            </div>
            {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
          </div>
        )}
        {children}
      </Container>
    </section>
  );
}
