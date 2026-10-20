import { CARD_CODE, COPY_LIMIT } from './deck-rules';

const PRINTING = new RegExp(
  `^(${CARD_CODE.source.slice(1, -1)})(?:_[A-Z0-9]+)?$`,
  'i',
);
const TEXT_LINE = /^(\d+)\s*x\s*([A-Z0-9_-]+)\s*$/i;
const MAX_COPIES = 99;
const MAX_LINES = 50;
const MAX_NOTES = 6;

export class OpsimError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OpsimError';
  }
}

export type OpsimRole = 'main' | 'leader' | 'don';

export type OpsimCard = {
  code: string;
  quantity: number;
  role: OpsimRole;
};

export type OpsimParse = {
  name: string | null;
  cards: OpsimCard[];
  skipped: number;
};

export type AssembledDeck = {
  name: string | null;
  leaderCode: string | null;
  lines: { code: string; quantity: number }[];
  notes: string[];
};

export function parseOpsim(source: string): OpsimParse {
  const text = source.replace(/^\uFEFF/, '').trim();
  if (!text) throw new OpsimError('Pega un mazo en texto o JSON.');
  return text.startsWith('{') ? parseJson(text) : parseText(text);
}

export function assembleOpsim(
  parsed: OpsimParse,
  types: Map<string, string | null>,
): AssembledDeck {
  const notes: string[] = [];
  const leaders: OpsimCard[] = [];
  const lines: { code: string; quantity: number }[] = [];
  const unknown: string[] = [];
  const heavy: string[] = [];
  const don: string[] = [];

  for (const card of parsed.cards) {
    const type = types.get(card.code) ?? null;
    const isLeader = card.role === 'leader' || type === 'Leader';
    const isDon = !isLeader && (card.role === 'don' || type === 'DON!!');
    if (isDon) {
      don.push(card.code);
      continue;
    }
    if (isLeader) {
      leaders.push(card);
      continue;
    }
    if (!type) unknown.push(card.code);
    const quantity = Math.min(MAX_COPIES, card.quantity);
    if (quantity > COPY_LIMIT) heavy.push(`${card.code} (${quantity})`);
    lines.push({ code: card.code, quantity });
  }

  if (don.length > 0) {
    pushNote(notes, `Se omitieron DON!!: ${listCodes(don)}.`);
  }
  if (unknown.length > 0) {
    pushNote(notes, `No están en el catálogo: ${listCodes(unknown)}.`);
  }
  if (heavy.length > 0) {
    pushNote(
      notes,
      `Superan las 4 copias y se conservan así: ${listCodes(heavy)}.`,
    );
  }
  if (parsed.skipped > 0) {
    pushNote(
      notes,
      parsed.skipped === 1
        ? '1 línea no se reconoció.'
        : `${parsed.skipped} líneas no se reconocieron.`,
    );
  }

  let leaderCode: string | null = null;
  if (leaders.length > 0) {
    leaderCode = leaders[0].code;
    if (leaders[0].quantity > 1) {
      pushNote(
        notes,
        `El líder ${leaderCode} figuraba con ${leaders[0].quantity} copias; se deja 1.`,
      );
    }
    const extra = leaders.slice(1).map((card) => card.code);
    if (extra.length > 0) {
      pushNote(
        notes,
        `También había otros líderes y no entran en las 50: ${listCodes(extra)}.`,
      );
    }
  }

  if (!leaderCode && lines.length === 0) {
    throw new OpsimError('No encuentro cartas en ese mazo.');
  }
  if (lines.length > MAX_LINES) {
    throw new OpsimError('Ese mazo tiene más de 50 cartas distintas.');
  }

  return { name: parsed.name, leaderCode, lines, notes };
}

function parseText(text: string): OpsimParse {
  const totals = new Map<string, number>();
  const order: string[] = [];
  let skipped = 0;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#') || line.startsWith('//')) continue;
    const match = TEXT_LINE.exec(line);
    const code = match ? printingCode(match[2]) : null;
    const quantity = match ? Number(match[1]) : 0;
    if (!code || !Number.isInteger(quantity) || quantity < 1) {
      skipped += 1;
      continue;
    }
    if (!totals.has(code)) order.push(code);
    totals.set(code, (totals.get(code) ?? 0) + quantity);
  }
  return {
    name: null,
    cards: order.map((code) => ({
      code,
      quantity: totals.get(code) ?? 0,
      role: 'main' as const,
    })),
    skipped,
  };
}

function parseJson(text: string): OpsimParse {
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    throw new OpsimError('Ese JSON no es un mazo de OP Sim.');
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new OpsimError('Ese JSON no es un mazo de OP Sim.');
  }
  const record = body as { metadata?: unknown; deck?: unknown };
  const deck = record.deck;
  if (!deck || typeof deck !== 'object' || Array.isArray(deck)) {
    throw new OpsimError('Ese JSON no es un mazo de OP Sim.');
  }
  const sections = deck as Record<string, unknown>;
  const totals = new Map<string, { quantity: number; role: OpsimRole }>();
  const order: string[] = [];
  let skipped = 0;
  skipped += takeSection(
    sections,
    ['leader', 'leader deck'],
    'leader',
    totals,
    order,
  );
  skipped += takeSection(
    sections,
    ['main deck', 'main'],
    'main',
    totals,
    order,
  );
  skipped += takeSection(
    sections,
    ['don', 'don!!', 'don deck', 'don!! deck'],
    'don',
    totals,
    order,
  );
  return {
    name: cleanName(metadataName(record.metadata)),
    cards: order.map((code) => {
      const card = totals.get(code);
      return {
        code,
        quantity: card?.quantity ?? 0,
        role: card?.role ?? 'main',
      };
    }),
    skipped,
  };
}

function takeSection(
  deck: Record<string, unknown>,
  names: string[],
  role: OpsimRole,
  totals: Map<string, { quantity: number; role: OpsimRole }>,
  order: string[],
) {
  const wanted = new Set(names);
  let skipped = 0;
  for (const [key, value] of Object.entries(deck)) {
    if (!wanted.has(key.trim().toLowerCase()) || !Array.isArray(value))
      continue;
    for (const entry of value) {
      const card = readEntry(entry);
      if (!card) {
        skipped += 1;
        continue;
      }
      const current = totals.get(card.code);
      if (!current) {
        order.push(card.code);
        totals.set(card.code, { quantity: card.quantity, role });
        continue;
      }
      current.quantity += card.quantity;
      if (role === 'leader') current.role = 'leader';
      else if (role === 'don' && current.role !== 'leader')
        current.role = 'don';
    }
  }
  return skipped;
}

function readEntry(entry: unknown) {
  if (!entry || typeof entry !== 'object') return null;
  const record = entry as { id?: unknown; count?: unknown };
  const code = typeof record.id === 'string' ? printingCode(record.id) : null;
  const quantity = Number(record.count);
  if (!code || !Number.isInteger(quantity) || quantity < 1) return null;
  return { code, quantity };
}

function printingCode(value: string) {
  const match = PRINTING.exec(value.trim());
  return match ? match[1].toUpperCase() : null;
}

function metadataName(metadata: unknown) {
  if (!metadata || typeof metadata !== 'object') return null;
  const name = (metadata as { name?: unknown }).name;
  return typeof name === 'string' ? name : null;
}

function cleanName(name: string | null) {
  const trimmed = name?.trim() ?? '';
  if (!trimmed) return null;
  return trimmed.slice(0, 60);
}

function listCodes(codes: string[]) {
  const shown = codes.slice(0, 4);
  const extra = codes.length - shown.length;
  return extra > 0 ? `${shown.join(', ')} y ${extra} más` : shown.join(', ');
}

function pushNote(notes: string[], note: string) {
  if (notes.length < MAX_NOTES) notes.push(note);
}
