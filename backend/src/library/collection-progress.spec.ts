import {
  buildRows,
  buildSlots,
  classifyPrintings,
  CollectionCard,
  CollectionGoal,
  summarize,
  wishlistPlan,
} from './collection-progress';

const SET = 'one-piece-romance-dawn';

function card(
  partial: Partial<CollectionCard> &
    Pick<CollectionCard, 'externalId' | 'name'>,
): CollectionCard {
  return {
    setExternalId: SET,
    code: 'OP01-001',
    cardType: 'Character',
    ...partial,
  };
}

const baseGoal: CollectionGoal = {
  mode: 'base',
  customCopies: 2,
  excludedVariants: [],
};

describe('progreso de colección', () => {
  const zoro = card({
    externalId: 1,
    name: 'Roronoa Zoro (001)',
    cardType: 'Leader',
  });
  const zoroParallel = card({
    externalId: 2,
    name: 'Roronoa Zoro (001) (Parallel)',
    cardType: 'Leader',
  });
  const nami = card({
    externalId: 3,
    name: 'Nami',
    code: 'OP01-016',
  });
  const namiParallel = card({
    externalId: 4,
    name: 'Nami (Parallel)',
    code: 'OP01-016',
  });
  const don = card({
    externalId: 5,
    name: 'DON!! Card',
    code: null,
    cardType: 'DON!!',
  });

  const classified = classifyPrintings([
    zoro,
    zoroParallel,
    nami,
    namiParallel,
    don,
  ]);

  it('trata el número entre paréntesis como carta base y el resto como variante', () => {
    const byId = new Map(
      classified.map((item) => [item.externalId, item.variantLabel]),
    );
    expect(byId.get(1)).toBeNull();
    expect(byId.get(2)).toBe('Parallel');
    expect(byId.get(4)).toBe('Parallel');
    expect(byId.get(5)).toBeNull();
  });

  it('en base solo pide una copia de cada carta base', () => {
    const slots = buildSlots(
      classified,
      baseGoal,
      new Map([[2, { owned: 1, wanted: 0 }]]),
    );
    expect(slots.map((slot) => slot.externalId).sort()).toEqual([1, 3, 5]);
    expect(summarize(slots)).toMatchObject({
      obtained: 0,
      total: 3,
      missing: 3,
      percent: 0,
    });
  });

  it('en master set incluye las variantes que no estén excluidas', () => {
    const included = buildSlots(
      classified,
      { ...baseGoal, mode: 'master' },
      new Map(),
    );
    expect(included).toHaveLength(5);
    const excluded = buildSlots(
      classified,
      { ...baseGoal, mode: 'master', excludedVariants: ['Parallel'] },
      new Map(),
    );
    expect(excluded.map((slot) => slot.externalId).sort()).toEqual([1, 3, 5]);
  });

  it('en playset suma copias de la misma carta, pide una de líder y deja fuera DON!!', () => {
    const slots = buildSlots(
      classified,
      { ...baseGoal, mode: 'playset' },
      new Map([
        [1, { owned: 1, wanted: 0 }],
        [2, { owned: 2, wanted: 1 }],
        [3, { owned: 4, wanted: 0 }],
      ]),
    );
    const leader = slots.find((slot) => slot.externalId === 1);
    const character = slots.find((slot) => slot.externalId === 3);
    expect(slots.map((slot) => slot.externalId)).not.toContain(5);
    expect(leader).toMatchObject({ target: 1, owned: 3, wanted: 1 });
    expect(character).toMatchObject({ target: 4, owned: 4 });
    expect(summarize(slots).percent).toBe(100);
  });

  it('en personalizado usa las copias elegidas', () => {
    const slots = buildSlots(
      classified,
      { ...baseGoal, mode: 'custom', customCopies: 3 },
      new Map([[3, { owned: 3, wanted: 0 }]]),
    );
    expect(slots.find((slot) => slot.externalId === 3)?.target).toBe(3);
    expect(summarize(slots)).toMatchObject({
      obtained: 1,
      total: 3,
      percent: 33.3,
    });
  });

  it('calcula el porcentaje con un decimal', () => {
    const slots = Array.from({ length: 121 }, (_, index) =>
      card({
        externalId: index + 1,
        name: `Carta ${index}`,
        code: `OP01-${index}`,
      }),
    );
    const classifiedSlots = classifyPrintings(slots);
    const quantities = new Map(
      classifiedSlots
        .slice(0, 85)
        .map((item) => [item.externalId, { owned: 1, wanted: 0 }]),
    );
    expect(
      summarize(buildSlots(classifiedSlots, baseGoal, quantities)).percent,
    ).toBe(70.2);
  });

  it('añade a deseados solo las copias que aún no están pedidas', () => {
    const slots = buildSlots(
      classified,
      { ...baseGoal, mode: 'playset' },
      new Map([
        [1, { owned: 0, wanted: 1 }],
        [3, { owned: 1, wanted: 0 }],
        [4, { owned: 0, wanted: 1 }],
      ]),
    );
    expect(wishlistPlan(slots)).toEqual([{ externalId: 3, quantity: 2 }]);
  });

  it('en un set de reimpresiones usa Reprint como carta base', () => {
    const reprint = card({
      externalId: 10,
      name: 'Marco (Reprint)',
      code: 'OP02-018',
      setExternalId: 'prb',
    });
    const art = card({
      externalId: 11,
      name: 'Marco (Alternate Art)',
      code: 'OP02-018',
      setExternalId: 'prb',
    });
    const foil = card({
      externalId: 12,
      name: 'Marco (Jolly Roger Foil)',
      code: 'OP02-018',
      setExternalId: 'prb',
    });
    const labels = new Map(
      classifyPrintings([art, foil, reprint]).map((item) => [
        item.externalId,
        item.variantLabel,
      ]),
    );
    expect(labels.get(10)).toBeNull();
    expect(labels.get(11)).toBe('Alternate Art');
    expect(labels.get(12)).toBe('Jolly Roger Foil');
    expect(
      buildSlots(classifyPrintings([art, foil, reprint]), baseGoal, new Map()),
    ).toHaveLength(1);
  });

  it('muestra las variantes aunque no cuenten para el objetivo base', () => {
    const rows = buildRows(
      classified,
      baseGoal,
      new Map([[4, { owned: 2, wanted: 1 }]]),
    );
    const parallel = rows.find((row) => row.externalId === 4);
    expect(parallel).toMatchObject({ inGoal: false, owned: 2, wanted: 1 });
    expect(rows.some((row) => row.inGoal && row.externalId === 3)).toBe(true);
  });
});
