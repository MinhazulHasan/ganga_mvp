/*
 * Tiny XML highlighter for CAP documents built in the browser (what-if runs).
 * Emits the same markup and token colours as the server's Shiki output (GitHub Light / Dracula),
 * so a what-if CAP looks exactly like the baseline one. Input is our own well-formed CAP XML.
 */

const TOKEN = {
  text: "--shiki-light:#24292E;--shiki-dark:#F8F8F2",
  tag: "--shiki-light:#22863A;--shiki-dark:#FF79C6",
  attr: "--shiki-light:#6F42C1;--shiki-dark:#50FA7B",
  quote: "--shiki-light:#032F62;--shiki-dark:#E9F284",
  value: "--shiki-light:#032F62;--shiki-dark:#F1FA8C",
  entity: "--shiki-light:#005CC5;--shiki-dark:#BD93F9",
} as const;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const span = (k: keyof typeof TOKEN, text: string) => (text ? `<span style="${TOKEN[k]}">${esc(text)}</span>` : "");

const TAG = /(<\?|<\/|<)([A-Za-z_][\w:.-]*)((?:\s+[\w:.-]+\s*=\s*"[^"]*")*)(\s*)(\?>|\/>|>)|&(?:[A-Za-z]+|#\d+|#x[0-9A-Fa-f]+);/g;
const ATTR = /(\s+[\w:.-]+)(\s*=\s*)"([^"]*)"/g;

function line(src: string): string {
  let out = "";
  let last = 0;
  for (const m of src.matchAll(TAG)) {
    const at = m.index ?? 0;
    out += span("text", src.slice(last, at));
    if (m[1]) {
      out += span("text", m[1]) + span("tag", m[2]);
      for (const a of m[3].matchAll(ATTR)) {
        out += span("attr", a[1]) + span("text", a[2]) + span("quote", '"') + span("value", a[3]) + span("quote", '"');
      }
      out += span("text", m[4] + m[5]);
    } else {
      out += span("entity", m[0]);
    }
    last = at + m[0].length;
  }
  return out + span("text", src.slice(last));
}

export function highlightXml(xml: string): string {
  const body = xml
    .split("\n")
    .map((l) => `<span class="line">${line(l)}</span>`)
    .join("\n");
  return `<pre class="shiki shiki-themes github-light dracula" style="--shiki-light:#24292e;--shiki-dark:#F8F8F2;--shiki-light-bg:#fff;--shiki-dark-bg:#282A36" tabindex="0"><code>${body}</code></pre>`;
}
