export const DECK_SIZE = 50;
export const COPY_LIMIT = 4;
export const DON_DECK = 10;

export const DECK_FORMATS = ['extra', 'standard'] as const;
export type DeckFormat = (typeof DECK_FORMATS)[number];

export const CARD_CODE = /^[A-Z]{1,4}\d{0,2}-\d{3}$/;
const MAIN_TYPES = new Set(['Character', 'Event', 'Stage']);

export type RulesList = {
  id: string;
  effectiveFrom: string;
  effectiveUntil: string | null;
  banned: readonly string[];
  restricted: readonly { code: string; max: number }[];
  pairs: readonly (readonly [string, string])[];
};

export const RULES_LISTS: readonly RulesList[] = [
  {
    id: '2026-10-12',
    effectiveFrom: '2026-10-12',
    effectiveUntil: null,
    banned: [
      'OP03-040',
      'OP06-047',
      'OP06-086',
      'OP06-116',
      'OP14-020',
      'ST10-001',
    ],
    restricted: [],
    pairs: [
      ['OP07-115', 'EB04-058'],
      ['OP11-040', 'OP11-067'],
      ['OP11-040', 'OP08-069'],
    ],
  },
];

const MONTHS = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
];

export type Playable = {
  code: string;
  name: string;
  cardType: string | null;
  colors: string[];
  cost: number | null;
};

export type ConstructionIssue =
  | { code: 'leader-missing' }
  | { code: 'leader-unknown' }
  | { code: 'leader-type' }
  | { code: 'size'; have: number }
  | { code: 'copies'; card: string; quantity: number }
  | { code: 'color'; card: string }
  | { code: 'type'; card: string }
  | { code: 'unknown'; card: string };

export type LegalityStatus = 'legal' | 'illegal' | 'unchecked';

export type Legality = {
  status: LegalityStatus;
  rulesId: string | null;
  blockChecked: boolean;
  banned: string[];
  pairs: [string, string][];
  restricted: { code: string; quantity: number; max: number }[];
};

export function rulesLabel(id: string | null) {
  if (!id) return null;
  const [year, month, day] = id.split('-');
  const name = MONTHS[Number(month) - 1];
  if (!year || !name || !day) return id;
  return `${Number(day)} ${name} ${year}`;
}

export function currentRules(today = new Date()): RulesList | null {
  const day = today.toISOString().slice(0, 10);
  return (
    RULES_LISTS.find(
      (list) =>
        list.effectiveFrom <= day &&
        (list.effectiveUntil === null || day < list.effectiveUntil),
    ) ?? null
  );
}

export function rulesById(id: string | null | undefined): RulesList | null {
  if (!id) return null;
  return RULES_LISTS.find((list) => list.id === id) ?? null;
}

export function normalizeCode(value: string) {
  const code = value.trim().toUpperCase();
  return CARD_CODE.test(code) ? code : null;
}

export function normalizeLines(lines: { code: string; quantity: number }[]) {
  const totals = new Map<string, number>();
  for (const line of lines) {
    const code = normalizeCode(line.code);
    if (!code || !Number.isInteger(line.quantity) || line.quantity < 1) {
      continue;
    }
    totals.set(code, (totals.get(code) ?? 0) + line.quantity);
  }
  return [...totals].map(([code, quantity]) => ({ code, quantity }));
}

export function splitCardColors(color?: string | null) {
  if (!color) return [];
  return color
    .split(/[;/]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function parseCost(value?: string | null) {
  if (!value) return null;
  const cost = Number(value);
  if (!Number.isInteger(cost) || cost < 0 || cost > 20) return null;
  return cost;
}

export function pickCanonical<T extends { name: string; externalId: number }>(
  cards: T[],
): T {
  return [...cards].sort((left, right) => {
    const score = variantScore(left.name) - variantScore(right.name);
    if (score !== 0) return score;
    if (left.name.length !== right.name.length) {
      return left.name.length - right.name.length;
    }
    return left.externalId - right.externalId;
  })[0];
}

export function checkConstruction(
  leaderCode: string | null,
  leader: Playable | null,
  lines: { code: string; quantity: number; card: Playable | null }[],
) {
  const issues: ConstructionIssue[] = [];
  if (!leaderCode) issues.push({ code: 'leader-missing' });
  else if (!leader) issues.push({ code: 'leader-unknown' });
  else if (leader.cardType !== 'Leader') issues.push({ code: 'leader-type' });

  const leaderColors = new Set(leader?.colors ?? []);
  let size = 0;
  for (const line of lines) {
    if (!line.card) {
      issues.push({ code: 'unknown', card: line.code });
      continue;
    }
    if (!line.card.cardType || !MAIN_TYPES.has(line.card.cardType)) {
      issues.push({ code: 'type', card: line.code });
      continue;
    }
    size += line.quantity;
    if (line.quantity > COPY_LIMIT) {
      issues.push({
        code: 'copies',
        card: line.code,
        quantity: line.quantity,
      });
    }
    if (!leader || leader.cardType !== 'Leader') continue;
    const colors = line.card.colors;
    if (
      colors.length === 0 ||
      colors.some((color) => !leaderColors.has(color))
    ) {
      issues.push({ code: 'color', card: line.code });
    }
  }
  if (size !== DECK_SIZE) issues.push({ code: 'size', have: size });
  return { ok: issues.length === 0, size, target: DECK_SIZE, issues };
}

export function presentCopies(
  leaderCode: string | null,
  lines: { code: string; quantity: number }[],
) {
  const totals = new Map<string, number>();
  for (const line of lines) {
    totals.set(line.code, (totals.get(line.code) ?? 0) + line.quantity);
  }
  if (leaderCode && !totals.has(leaderCode)) totals.set(leaderCode, 1);
  return [...totals].map(([code, quantity]) => ({ code, quantity }));
}

export function checkLegality(
  format: DeckFormat,
  present: { code: string; quantity: number }[],
  rules: RulesList | null,
): Legality {
  const empty = {
    banned: [] as string[],
    pairs: [] as [string, string][],
    restricted: [] as { code: string; quantity: number; max: number }[],
  };
  if (!rules) {
    return {
      status: 'unchecked',
      rulesId: null,
      blockChecked: false,
      ...empty,
    };
  }

  const quantities = new Map(present.map((line) => [line.code, line.quantity]));
  const banned = rules.banned.filter((code) => quantities.has(code));
  const pairs = rules.pairs
    .filter(([left, right]) => quantities.has(left) && quantities.has(right))
    .map((pair) => [pair[0], pair[1]] as [string, string]);
  const restricted = rules.restricted.flatMap((rule) => {
    const quantity = quantities.get(rule.code) ?? 0;
    return quantity > rule.max
      ? [{ code: rule.code, quantity, max: rule.max }]
      : [];
  });
  const knownIllegal =
    banned.length > 0 || pairs.length > 0 || restricted.length > 0;
  return {
    status: knownIllegal
      ? 'illegal'
      : format === 'standard'
        ? 'unchecked'
        : 'legal',
    rulesId: rules.id,
    blockChecked: format === 'extra',
    banned,
    pairs,
    restricted,
  };
}

export function checkAvailability(
  lines: { code: string; quantity: number }[],
  ownedByCode: ReadonlyMap<string, number>,
) {
  const rows = lines.map((line) => {
    const owned = ownedByCode.get(line.code) ?? 0;
    const missing = Math.max(0, line.quantity - owned);
    return {
      code: line.code,
      needed: line.quantity,
      owned,
      missing,
      covered: Math.min(line.quantity, owned),
    };
  });
  const listSize = rows.reduce((sum, row) => sum + row.needed, 0);
  const available = rows.reduce((sum, row) => sum + row.covered, 0);
  const missingCopies = rows.reduce((sum, row) => sum + row.missing, 0);
  return { rows, listSize, available, missingCopies, target: DECK_SIZE };
}

export function wishlistAdds(
  rows: { code: string; needed: number; owned: number }[],
  wantedByCode: ReadonlyMap<string, number>,
) {
  return rows.flatMap((row) => {
    const extra = row.needed - row.owned - (wantedByCode.get(row.code) ?? 0);
    return extra > 0 ? [{ code: row.code, extra }] : [];
  });
}

export function deckSummary(lines: { card: Playable; quantity: number }[]) {
  const colors = new Map<string, number>();
  const types = new Map<string, number>();
  const curve = new Map<string, number>();
  for (const line of lines) {
    if (!line.card.cardType || !MAIN_TYPES.has(line.card.cardType)) continue;
    for (const color of line.card.colors) {
      colors.set(color, (colors.get(color) ?? 0) + line.quantity);
    }
    types.set(
      line.card.cardType,
      (types.get(line.card.cardType) ?? 0) + line.quantity,
    );
    const bucket =
      line.card.cost === null
        ? '—'
        : line.card.cost >= 10
          ? '10+'
          : String(line.card.cost);
    curve.set(bucket, (curve.get(bucket) ?? 0) + line.quantity);
  }
  return {
    colors: [...colors].map(([color, copies]) => ({ color, copies })),
    types: [...types].map(([cardType, copies]) => ({ cardType, copies })),
    curve: [...curve]
      .map(([cost, copies]) => ({ cost, copies }))
      .sort((left, right) => curveRank(left.cost) - curveRank(right.cost)),
  };
}

function variantScore(name: string) {
  return /\([^)]+\)/.test(name) ? 1 : 0;
}

function curveRank(cost: string) {
  if (cost === '—') return 98;
  if (cost === '10+') return 10;
  return Number(cost);
}
