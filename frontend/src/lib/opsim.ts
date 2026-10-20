export type OpsimLine = { code: string; quantity: number };

export function opsimText(deck: { leaderCode?: string | null; lines: OpsimLine[] }) {
  const rows: string[] = [];
  if (deck.leaderCode) rows.push(`1x${deck.leaderCode}`);
  for (const line of deck.lines) {
    if (line.code === deck.leaderCode) continue;
    rows.push(`${line.quantity}x${line.code}`);
  }
  return rows.join("\n");
}

export function opsimJson(deck: {
  name: string;
  author: string;
  leaderCode?: string | null;
  lines: OpsimLine[];
}) {
  const main: { id: string; count: number }[] = [];
  if (deck.leaderCode) main.push({ id: deck.leaderCode, count: 1 });
  for (const line of deck.lines) {
    if (line.code === deck.leaderCode) continue;
    main.push({ id: line.code, count: line.quantity });
  }
  return `${JSON.stringify(
    {
      metadata: { name: deck.name.trim() || "Mazo", author: deck.author },
      deck: { "Main Deck": main },
    },
    null,
    2,
  )}\n`;
}

export function opsimFileName(name: string, extension: "txt" | "json") {
  const clean = name
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
  return `${clean || "mazo"}.${extension}`;
}
