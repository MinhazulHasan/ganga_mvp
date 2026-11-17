import * as React from "react";
import { cn } from "@/lib/utils";
import { Container } from "./container";

interface PageHeaderProps {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  meta?: React.ReactNode;
  className?: string;
}

/** Large-title page header (iOS "large title" feel). Use once at the top of each page. */
export function PageHeader({ eyebrow, title, description, actions, meta, className }: PageHeaderProps) {
  return (
    <header className={cn("relative overflow-hidden border-b border-border", className)}>
      <div className="dot-grid pointer-events-none absolute inset-0 mask-fade-b opacity-70" aria-hidden />
      <Container className="relative pb-12 pt-14 sm:pb-16 sm:pt-20">
        {eyebrow && <p className="mb-4 text-[13px] font-semibold uppercase tracking-[0.14em] text-brand">{eyebrow}</p>}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <h1 className="text-[40px] font-semibold leading-[1.04] tracking-[-0.035em] sm:text-[56px]">{title}</h1>
            {description && <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 flex-wrap items-center gap-2.5">{actions}</div>}
        </div>
        {meta && <div className="mt-8 flex flex-wrap items-center gap-2">{meta}</div>}
      </Container>
    </header>
  );
}
