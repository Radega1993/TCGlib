import { normalizeCode, normalizeLines } from './deck-rules';

const MAX_NAME = 80;
const MAX_AUTHOR = 40;
const MAX_LINES = 60;
export const VARIANTS_PER_LEADER = 3;

export type CommunityDeck = {
  slug: string;
  fingerprint: string;
  name: string;
  author: string;
  leaderCode: string;
  lines: { code: string; quantity: number }[];
  meta: string;
  views: number;
  publishedAt: Date;
};

export function readCommunityDeck(raw: unknown): CommunityDeck | null {
  if (!raw || typeof raw !== 'object') return null;
  const deck = raw as Record<string, unknown>;
  const slug = text(deck.slug, 80);
  const fingerprint = text(deck.fingerprint, 64);
  const leaderCode = baseCode(text(deck.leader, 40));
  if (!slug || !fingerprint || !leaderCode) return null;

  const lines = readLines(deck.deck, leaderCode);
  if (!lines.length || lines.length > MAX_LINES) return null;

  const publishedAt = unixDate(deck.date);
  if (!publishedAt) return null;

  return {
    slug,
    fingerprint,
    name: text(deck.humanname, MAX_NAME) || text(deck.name, MAX_NAME) || slug,
    author: text(deck.authornick, MAX_AUTHOR) || 'Comunidad',
    leaderCode,
    lines,
    meta: text(deck.format, 20) || 'Extra',
    views: count(deck.views),
    publishedAt,
  };
}

function readLines(raw: unknown, leaderCode: string) {
  if (!raw || typeof raw !== 'object') return [];
  const rows = Object.entries(raw as Record<string, unknown>).flatMap(
    ([code, quantity]) => {
      const copies = count(quantity);
      const card = baseCode(code);
      if (!copies || !card || card === leaderCode) return [];
      return [{ code: card, quantity: Math.min(copies, 99) }];
    },
  );
  return normalizeLines(rows);
}

function text(value: unknown, max: number) {
  if (typeof value !== 'string' && typeof value !== 'number') return '';
  return String(value).trim().slice(0, max);
}

function count(value: unknown) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) return 0;
  return parsed;
}

export function isCommunityList(deck: { lines: { quantity: number }[] }) {
  const copies = deck.lines.reduce((sum, line) => sum + line.quantity, 0);
  return copies >= 48 && copies <= 52;
}

export function leadersNeedingDecks(
  leaders: string[],
  stored: { leaderCode: string }[],
  limit = VARIANTS_PER_LEADER,
) {
  const counts = new Map<string, number>();
  for (const deck of stored) {
    counts.set(deck.leaderCode, (counts.get(deck.leaderCode) ?? 0) + 1);
  }
  return leaders.filter((code) => (counts.get(code) ?? 0) < limit);
}

export function pickNewVariants(
  incoming: CommunityDeck[],
  stored: { slug: string; fingerprint: string; leaderCode: string }[],
  limit = VARIANTS_PER_LEADER,
) {
  const known = new Set<string>();
  const counts = new Map<string, number>();
  for (const deck of stored) {
    known.add(deck.slug);
    known.add(deck.fingerprint);
    counts.set(deck.leaderCode, (counts.get(deck.leaderCode) ?? 0) + 1);
  }

  const ranked = [...incoming].sort(
    (left, right) =>
      right.views - left.views ||
      right.publishedAt.getTime() - left.publishedAt.getTime(),
  );
  const fresh: CommunityDeck[] = [];
  let kept = 0;
  for (const deck of ranked) {
    if (known.has(deck.slug) || known.has(deck.fingerprint)) {
      kept += 1;
      continue;
    }
    const have = counts.get(deck.leaderCode) ?? 0;
    if (have >= limit) continue;
    fresh.push(deck);
    counts.set(deck.leaderCode, have + 1);
    known.add(deck.slug);
    known.add(deck.fingerprint);
  }
  return { fresh, kept };
}

function baseCode(value: string) {
  return normalizeCode(value.trim().toUpperCase().replace(/_[A-Z0-9]+$/, ''));
}

function unixDate(value: unknown) {
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds < 1_000_000_000) return null;
  return new Date(seconds * 1000);
}
