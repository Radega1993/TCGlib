export const COLLECTION_MODES = [
  'base',
  'master',
  'playset',
  'custom',
] as const;
export type CollectionMode = (typeof COLLECTION_MODES)[number];

export const COLLECTION_VIEWS = [
  'todas',
  'faltan',
  'tienes',
  'repetidas',
  'deseadas',
] as const;
export type CollectionView = (typeof COLLECTION_VIEWS)[number];

export type CollectionGoal = {
  mode: CollectionMode;
  customCopies: number;
  excludedVariants: string[];
};

export type CollectionCard = {
  externalId: number;
  name: string;
  code?: string | null;
  cardType?: string | null;
  rarity?: string | null;
  image?: string | null;
  setExternalId: string;
};

export type ClassifiedCard = CollectionCard & {
  variantLabel: string | null;
};

export type CardQuantity = {
  owned: number;
  wanted: number;
};

export type CollectionSlot = {
  externalId: number;
  setExternalId: string;
  name: string;
  code?: string | null;
  cardType?: string | null;
  rarity?: string | null;
  image?: string | null;
  variantLabel: string | null;
  target: number;
  owned: number;
  wanted: number;
  productWanted: number;
};

export type CollectionRow = CollectionSlot & {
  inGoal: boolean;
  counted: number;
};

const EMPTY: CardQuantity = { owned: 0, wanted: 0 };

export function normalizeGoal(input: unknown): CollectionGoal {
  const raw =
    input && typeof input === 'object'
      ? (input as Record<string, unknown>)
      : {};
  const mode = COLLECTION_MODES.includes(raw.mode as CollectionMode)
    ? (raw.mode as CollectionMode)
    : 'base';
  const copies = Number(raw.customCopies);
  const customCopies =
    Number.isInteger(copies) && copies >= 1 && copies <= 99 ? copies : 2;
  const excluded = Array.isArray(raw.excludedVariants)
    ? [
        ...new Set(
          raw.excludedVariants
            .filter((value): value is string => typeof value === 'string')
            .map((value) => value.trim())
            .filter((value) => value.length > 0 && value.length <= 120),
        ),
      ].slice(0, 200)
    : [];
  return { mode, customCopies, excludedVariants: excluded };
}

export function classifyPrintings(cards: CollectionCard[]): ClassifiedCard[] {
  const groups = new Map<string, CollectionCard[]>();
  for (const card of cards) {
    const code = card.code?.trim();
    const key = `${card.setExternalId}\n${code || `solo:${card.externalId}`}`;
    const group = groups.get(key);
    if (group) group.push(card);
    else groups.set(key, [card]);
  }

  const classified: ClassifiedCard[] = [];
  for (const group of groups.values()) {
    classified.push(...classifyGroup(group));
  }
  return classified;
}

function classifyGroup(group: CollectionCard[]): ClassifiedCard[] {
  const baseIndex = pickBase(group);
  if (baseIndex !== -1) {
    return group.map((card, index) => ({
      ...card,
      variantLabel:
        index === baseIndex
          ? null
          : labelFrom(group[baseIndex].name, card.name),
    }));
  }

  const parsed = group.map((card) => ({ card, ...splitPrinting(card.name) }));
  const stem = parsed[0]?.stem;
  if (!stem || parsed.some((item) => item.stem !== stem)) {
    return group.map((card) => ({ ...card, variantLabel: null }));
  }

  const base = chooseTaggedBase(parsed);
  return parsed.map((item) => ({
    ...item.card,
    variantLabel:
      item.card.externalId === base.card.externalId
        ? null
        : item.tags.join(' · ').slice(0, 120) || 'Variante',
  }));
}

export function variantOptions(cards: ClassifiedCard[]) {
  const counts = new Map<string, number>();
  for (const card of cards) {
    if (!card.variantLabel) continue;
    counts.set(card.variantLabel, (counts.get(card.variantLabel) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, cards]) => ({ label, cards }))
    .sort((a, b) => b.cards - a.cards || a.label.localeCompare(b.label, 'es'));
}

export function buildSlots(
  cards: ClassifiedCard[],
  goal: CollectionGoal,
  quantities: ReadonlyMap<number, CardQuantity>,
) {
  return planGroups(cards, goal, quantities).flatMap((group) => group.slots);
}

export function buildRows(
  cards: ClassifiedCard[],
  goal: CollectionGoal,
  quantities: ReadonlyMap<number, CardQuantity>,
) {
  return planGroups(cards, goal, quantities)
    .flatMap((group) => group.rows)
    .sort(compareCards);
}

export function summarize(slots: CollectionSlot[]) {
  const total = slots.length;
  const obtained = slots.filter((slot) => slot.owned >= slot.target).length;
  const duplicates = slots.filter((slot) => slot.owned > slot.target).length;
  const wanted = slots.filter((slot) => slot.wanted > 0).length;
  const percent = total === 0 ? 0 : Math.round((obtained / total) * 1000) / 10;
  return {
    obtained,
    total,
    missing: total - obtained,
    duplicates,
    wanted,
    percent,
  };
}

export function rowMatches(row: CollectionRow, view: CollectionView) {
  if (view === 'faltan') return row.inGoal && row.counted < row.target;
  if (view === 'tienes') return row.owned > 0 || row.counted > 0;
  if (view === 'repetidas') {
    return row.owned > 1 || (row.inGoal && row.counted > row.target);
  }
  if (view === 'deseadas') return row.wanted > 0;
  return true;
}

export function wishlistPlan(slots: CollectionSlot[]) {
  const updates: { externalId: number; quantity: number }[] = [];
  for (const slot of slots) {
    const extra = slot.target - slot.owned - slot.wanted;
    if (extra <= 0) continue;
    const quantity = Math.min(99, slot.productWanted + extra);
    if (quantity <= slot.productWanted) continue;
    updates.push({ externalId: slot.externalId, quantity });
  }
  return updates;
}

function planGroups(
  cards: ClassifiedCard[],
  goal: CollectionGoal,
  quantities: ReadonlyMap<number, CardQuantity>,
) {
  const groups = new Map<string, ClassifiedCard[]>();
  for (const card of cards) {
    const code = card.code?.trim();
    const key = `${card.setExternalId}\n${code || `solo:${card.externalId}`}`;
    const group = groups.get(key);
    if (group) group.push(card);
    else groups.set(key, [card]);
  }

  return [...groups.values()].map((group) => {
    const targets = goalTargets(group, goal);
    const sumOwned = group.reduce(
      (sum, card) => sum + readQuantity(quantities, card.externalId).owned,
      0,
    );
    const sumWanted = group.reduce(
      (sum, card) => sum + readQuantity(quantities, card.externalId).wanted,
      0,
    );
    const slots: CollectionSlot[] = [];
    const rows: CollectionRow[] = [];

    for (const card of group) {
      const own = readQuantity(quantities, card.externalId);
      const target = targets.get(card.externalId) ?? 0;
      const inGoal = target > 0;
      const counted = inGoal && goal.mode === 'playset' ? sumOwned : own.owned;
      const row: CollectionRow = {
        externalId: card.externalId,
        setExternalId: card.setExternalId,
        name: card.name,
        code: card.code,
        cardType: card.cardType,
        rarity: card.rarity,
        image: card.image,
        variantLabel: card.variantLabel,
        target: inGoal ? target : 0,
        owned: own.owned,
        wanted: own.wanted,
        productWanted: own.wanted,
        inGoal,
        counted,
      };
      rows.push(row);
      if (!inGoal) continue;
      slots.push({
        ...row,
        owned: goal.mode === 'playset' ? sumOwned : own.owned,
        wanted: goal.mode === 'playset' ? sumWanted : own.wanted,
      });
    }

    return { slots, rows };
  });
}

function goalTargets(group: ClassifiedCard[], goal: CollectionGoal) {
  const targets = new Map<number, number>();
  const bases = group
    .filter((card) => card.variantLabel === null)
    .sort(
      (a, b) => a.name.length - b.name.length || a.externalId - b.externalId,
    );
  const base = bases[0] ?? group[0];

  if (goal.mode === 'playset') {
    if (base?.cardType === 'DON!!') return targets;
    if (base) {
      targets.set(base.externalId, base.cardType === 'Leader' ? 1 : 4);
    }
    return targets;
  }

  if (goal.mode === 'master') {
    const excluded = new Set(goal.excludedVariants);
    for (const card of group) {
      if (card.variantLabel && excluded.has(card.variantLabel)) continue;
      targets.set(card.externalId, 1);
    }
    return targets;
  }

  const target = goal.mode === 'custom' ? goal.customCopies : 1;
  for (const card of bases.length > 0 ? bases : group) {
    targets.set(card.externalId, target);
  }
  return targets;
}

const CARD_CODE = /^[A-Z]{1,8}\d{2,}-\d{3}[A-Z0-9-]*$/i;

function splitPrinting(name: string) {
  let rest = name.trim();
  const tags: string[] = [];
  for (;;) {
    const match = rest.match(/\s*\(([^)]+)\)\s*$/);
    if (!match) break;
    const inner = match[1].trim();
    if (/^\d+$/.test(inner)) break;
    rest = rest.slice(0, match.index).trim();
    if (!CARD_CODE.test(inner)) tags.unshift(inner);
  }
  rest = rest.replace(/\s+-\s+[A-Z]{1,8}\d{2,}-\d{3}[A-Z0-9-]*$/i, '').trim();
  return { stem: rest, tags };
}

function chooseTaggedBase(parsed: { card: CollectionCard; tags: string[] }[]) {
  const untagged = parsed.filter((item) => item.tags.length === 0);
  if (untagged.length > 0) return shortestPrinting(untagged);
  const reprints = parsed.filter(
    (item) =>
      item.tags.length === 1 && item.tags[0].toLowerCase() === 'reprint',
  );
  if (reprints.length > 0) return shortestPrinting(reprints);
  return shortestPrinting(parsed);
}

function shortestPrinting<T extends { card: CollectionCard }>(items: T[]) {
  return items.reduce((best, item) =>
    item.card.name.length < best.card.name.length ||
    (item.card.name.length === best.card.name.length &&
      item.card.externalId < best.card.externalId)
      ? item
      : best,
  );
}

function pickBase(group: CollectionCard[]) {
  const indexes = group
    .map((_, index) => index)
    .filter((index) =>
      group.every((card) => isExtension(group[index].name, card.name)),
    );
  if (indexes.length === 0) return -1;
  return indexes.reduce((best, index) =>
    group[index].name.length < group[best].name.length ? index : best,
  );
}

function isExtension(baseName: string, name: string) {
  if (name === baseName) return true;
  if (!name.startsWith(baseName) || name.length === baseName.length)
    return false;
  const next = name[baseName.length];
  return next === ' ' || next === '(' || next === '-' || next === '/';
}

function labelFrom(baseName: string, name: string) {
  let extra = name.slice(baseName.length).trim();
  extra = extra.replace(/^(?:\/\/|[-–])\s*/, '').trim();
  const groups = [...extra.matchAll(/\(([^)]+)\)/g)]
    .map((match) => match[1].trim())
    .filter(Boolean);
  const label = (groups.length > 0 ? groups.join(' · ') : extra)
    .replace(/\s+/g, ' ')
    .trim();
  return (label || 'Variante').slice(0, 120);
}

function readQuantity(
  quantities: ReadonlyMap<number, CardQuantity>,
  externalId: number,
) {
  return quantities.get(externalId) ?? EMPTY;
}

function compareCards(a: CollectionRow, b: CollectionRow) {
  const byCode = (a.code ?? '').localeCompare(b.code ?? '', 'en');
  if (byCode !== 0) return byCode;
  if ((a.variantLabel === null) !== (b.variantLabel === null)) {
    return a.variantLabel === null ? -1 : 1;
  }
  return a.name.localeCompare(b.name, 'es') || a.externalId - b.externalId;
}
