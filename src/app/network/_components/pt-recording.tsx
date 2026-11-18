"use client";

import * as React from "react";
import Image from "next/image";
import { toast } from "sonner";
import { DownloadIcon, FileCodeIcon, ImageIcon, MaximizeIcon, PlayIcon, VideoIcon } from "lucide-react";
import { Provenance } from "@/components/brand/provenance";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { ptMedia } from "@/content/network";
import { members } from "@/content/team";

const fmt = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;

/** Swarnima's own recording of the model, the original screenshot and the .pkt file. */
export function PtRecording({ configCount }: { configCount: number }) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [now, setNow] = React.useState(0);
  const [started, setStarted] = React.useState(false);
  const chapters = ptMedia.chapters;
  const current = chapters.reduce((acc, c, i) => (now >= c.t ? i : acc), 0);

  const seek = (t: number, label: string) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = t;
    void v.play().catch(() => {});
    setStarted(true);
    toast(`Jumped to ${fmt(t)} · ${label}`, { icon: <PlayIcon className="size-4" /> });
  };

  return (
    <div className="overflow-hidden rounded-[24px] border border-border bg-surface shadow-card">
      <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-primary/[0.07] text-primary dark:bg-primary/15">
            <VideoIcon className="size-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-2 text-[15px] font-semibold tracking-[-0.015em]">
              The real Packet Tracer run
              <Provenance kind="simulated" label="Packet Tracer" tip="Recorded in Cisco Packet Tracer, not on field hardware." />
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 p-4 sm:p-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        {/* Video + chapters */}
        <div className="min-w-0">
          <div className="relative overflow-hidden rounded-[16px] bg-black ring-1 ring-border">
            <video
              ref={videoRef}
              className="block aspect-video w-full"
              src={ptMedia.video}
              poster={ptMedia.poster}
              controls
              playsInline
              preload="metadata"
              onPlay={() => setStarted(true)}
              onTimeUpdate={(e) => setNow(e.currentTarget.currentTime)}
            >
              Your browser cannot play this video.
            </video>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Jump to a part of the video">
            {chapters.map((c, i) => {
              const on = started && i === current;
              return (
                <button
                  key={c.t}
                  type="button"
                  onClick={() => seek(c.t, c.label)}
                  aria-current={on ? "true" : undefined}
                  className={cn(
                    "inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[12px] font-medium outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/60",
                    on ? "bg-foreground text-background" : "bg-surface-2 text-foreground hairline hover:bg-surface-3"
                  )}
                >
                  <span className={cn("font-mono text-[11px] tabular", on ? "text-background/70" : "text-muted")}>{fmt(c.t)}</span>
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Screenshot + files */}
        <div className="flex min-w-0 flex-col gap-4">
          <Dialog>
            <DialogTrigger asChild>
              <button
                type="button"
                className="group relative block overflow-hidden rounded-[16px] bg-white text-left ring-1 ring-border outline-none transition-shadow hover:shadow-float focus-visible:ring-[3px] focus-visible:ring-ring/60"
                onClick={() => toast("Opened the Packet Tracer screenshot", { icon: <ImageIcon className="size-4" /> })}
              >
                <Image src={ptMedia.screenshot} alt="Swarnima's GANGA topology in Cisco Packet Tracer" width={1288} height={561} className="block h-auto w-full" />
                <span className="absolute bottom-2.5 right-2.5 inline-flex h-7 items-center gap-1.5 rounded-full bg-black/70 px-2.5 text-[11.5px] font-medium text-white backdrop-blur-sm transition-colors group-hover:bg-black/85">
                  <MaximizeIcon className="size-3.5" aria-hidden />
                  Original screenshot
                </span>
              </button>
            </DialogTrigger>
            <DialogContent className="w-[min(1240px,calc(100vw-24px))] p-4 sm:p-5">
              <DialogTitle className="pr-10">GANGA topology in Cisco Packet Tracer</DialogTitle>
              <DialogDescription>The original screenshot from Packet Tracer file.</DialogDescription>
              <div className="mt-4 overflow-auto rounded-[14px] bg-white ring-1 ring-border">
                <Image src={ptMedia.screenshot} alt="Swarnima's GANGA topology in Cisco Packet Tracer, full size" width={1288} height={561} className="block h-auto w-full min-w-[720px]" />
              </div>
            </DialogContent>
          </Dialog>

          <ul className="divide-y divide-border overflow-hidden rounded-[16px] bg-surface-2">
            <li className="flex items-center gap-3 px-4 py-3">
              <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-surface text-muted ring-1 ring-border">
                <FileCodeIcon className="size-4" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-mono text-[12.5px] font-medium">apieGanga.pkt</span>
                <span className="block text-[12px] text-muted">Packet Tracer file · {ptMedia.pktSize}</span>
              </span>
              <Button asChild variant="outline" size="sm">
                <a
                  href={ptMedia.pkt}
                  download="apieGanga.pkt"
                  onClick={() => toast.success("Downloading apieGanga.pkt", { description: "Open it with Cisco Packet Tracer, the same version or newer." })}
                >
                  <DownloadIcon />
                  Download
                </a>
              </Button>
            </li>
            <li className="flex items-center gap-3 px-4 py-3">
              <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-surface text-muted ring-1 ring-border">
                <FileCodeIcon className="size-4" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-medium">{configCount} config files</span>
                <span className="block text-[12px] text-muted">Click a router or the switch above to read its config.</span>
              </span>
              <Button variant="ghost" size="sm" asChild>
                <a href="#topology">View</a>
              </Button>
            </li>
          </ul>
          <p className="text-[12px] leading-relaxed text-subtle">
            The interactive diagram above is built from these files. The video is the run inside Packet Tracer itself.
          </p>
        </div>
      </div>
    </div>
  );
}
