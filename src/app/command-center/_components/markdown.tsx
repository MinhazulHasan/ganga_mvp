import * as React from "react";

/**
 * Tiny markdown renderer for the LLM report: headings, bullet/numbered lists, bold,
 * italics, inline code and paragraphs. Builds React elements (no HTML injection).
 */
export function Markdown({ source }: { source: string }) {
  const blocks = parseBlocks(source);
  return (
    <div className="flex flex-col gap-3 text-[14.5px] leading-relaxed">
      {blocks.map((b, i) => {
        if (b.type === "h") {
          const cls =
            b.level <= 1
              ? "mt-2 text-[20px] font-semibold tracking-[-0.025em]"
              : b.level === 2
                ? "mt-3 text-[16.5px] font-semibold tracking-[-0.02em]"
                : "mt-2 text-[14.5px] font-semibold";
          const Tag = (b.level <= 1 ? "h3" : b.level === 2 ? "h4" : "h5") as "h3" | "h4" | "h5";
          return (
            <Tag key={i} className={cls}>
              {inline(b.text)}
            </Tag>
          );
        }
        if (b.type === "p") {
          return (
            <p key={i} className="text-foreground/90">
              {inline(b.text)}
            </p>
          );
        }
        const List = b.type;
        return (
          <List key={i} className={b.type === "ul" ? "ml-5 list-disc space-y-1.5 marker:text-subtle" : "ml-5 list-decimal space-y-1.5 marker:text-subtle"}>
            {b.items.map((it, j) => (
              <li key={j} className="pl-1">
                {inline(it)}
              </li>
            ))}
          </List>
        );
      })}
    </div>
  );
}

type Block = { type: "h"; level: number; text: string } | { type: "p"; text: string } | { type: "ul" | "ol"; items: string[] };

function parseBlocks(src: string): Block[] {
  const lines = src.replace(/\r\n?/g, "\n").split("\n");
  const out: Block[] = [];
  let para: string[] = [];
  const flush = () => {
    if (para.length) out.push({ type: "p", text: para.join(" ") });
    para = [];
  };
  for (const raw of lines) {
    const line = raw.trimEnd();
    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    const ul = /^\s*[-*•]\s+(.*)$/.exec(line);
    const ol = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    if (!line.trim()) {
      flush();
      continue;
    }
    if (h) {
      flush();
      out.push({ type: "h", level: h[1].length, text: h[2] });
    } else if (ul || ol) {
      flush();
      const type = ul ? "ul" : "ol";
      const text = (ul ?? ol)![1];
      const last = out[out.length - 1];
      if (last && last.type === type) last.items.push(text);
      else out.push({ type, items: [text] });
    } else if (/^\s{2,}\S/.test(raw) && out.length && (out[out.length - 1].type === "ul" || out[out.length - 1].type === "ol") && !para.length) {
      // continuation line of the previous list item
      const last = out[out.length - 1] as { items: string[] };
      last.items[last.items.length - 1] += " " + line.trim();
    } else {
      para.push(line.trim());
    }
  }
  flush();
  return out;
}

/** **bold**, *italic* / _italic_, `code` */
function inline(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|\*[^*\s][^*]*\*|_[^_\s][^_]*_)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith("**") || tok.startsWith("__")) nodes.push(<strong key={k++} className="font-semibold text-foreground">{tok.slice(2, -2)}</strong>);
    else if (tok.startsWith("`")) nodes.push(<code key={k++} className="rounded-[5px] bg-surface-2 px-1 py-0.5 font-mono text-[0.88em]">{tok.slice(1, -1)}</code>);
    else nodes.push(<em key={k++}>{tok.slice(1, -1)}</em>);
    last = m.index + tok.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}
