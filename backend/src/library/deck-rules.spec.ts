import {
  checkAvailability,
  checkConstruction,
  checkLegality,
  currentRules,
  deckSummary,
  normalizeLines,
  pickCanonical,
  Playable,
  presentCopies,
  rulesById,
  wishlistAdds,
} from './deck-rules';

function card(partial: Partial<Playable> & Pick<Playable, 'code'>): Playable {
  return {
    name: partial.code,
    cardType: 'Character',
    colors: ['Red'],
    cost: 1,
    ...partial,
  };
}

const leader = card({
  code: 'OP01-001',
  cardType: 'Leader',
  colors: ['Red'],
  cost: null,
});

function fullDeck() {
  const lines: { code: string; quantity: number; card: Playable }[] = [];
  for (let index = 0; index < 10; index += 1) {
    const code = `OP01-${String(10 + index).padStart(3, '0')}`;
    lines.push({ code, quantity: 4, card: card({ code }) });
  }
  for (let index = 0; index < 5; index += 1) {
    const code = `OP01-${String(30 + index).padStart(3, '0')}`;
    lines.push({ code, quantity: 2, card: card({ code }) });
  }
  return lines;
}

describe('deck rules', () => {
  it('accepts one leader and 50 cards of the leader color', () => {
    const lines = fullDeck();
    const construction = checkConstruction('OP01-001', leader, lines);
    expect(construction.ok).toBe(true);
    expect(construction.size).toBe(50);

    const legality = checkLegality(
      'extra',
      presentCopies('OP01-001', lines),
      rulesById('2026-10-12'),
    );
    expect(legality.status).toBe('legal');
    expect(legality.blockChecked).toBe(true);
  });

  it('keeps a short list, a fifth copy and a wrong color apart', () => {
    const result = checkConstruction('OP01-001', leader, [
      { code: 'OP01-016', quantity: 5, card: card({ code: 'OP01-016' }) },
      {
        code: 'OP01-020',
        quantity: 1,
        card: card({ code: 'OP01-020', colors: ['Blue'] }),
      },
    ]);
    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        { code: 'copies', card: 'OP01-016', quantity: 5 },
        { code: 'color', card: 'OP01-020' },
        { code: 'size', have: 6 },
      ]),
    );
  });

  it('does not count a leader, a DON!! or an unknown code among the 50', () => {
    const result = checkConstruction('OP01-001', leader, [
      ...fullDeck(),
      {
        code: 'OP02-001',
        quantity: 1,
        card: card({ code: 'OP02-001', cardType: 'Leader' }),
      },
      {
        code: 'DON-001',
        quantity: 1,
        card: card({ code: 'DON-001', cardType: 'DON!!' }),
      },
      { code: 'OP09-999', quantity: 1, card: null },
    ]);
    expect(result.size).toBe(50);
    expect(result.issues.map((issue) => issue.code)).toEqual([
      'type',
      'type',
      'unknown',
    ]);
  });

  it('asks for a leader without painting every card as the wrong color', () => {
    const result = checkConstruction(null, null, fullDeck());
    expect(result.issues.map((issue) => issue.code)).toEqual([
      'leader-missing',
    ]);
  });

  it('marks a banned card and a banned pair, including the leader', () => {
    const rules = rulesById('2026-10-12');
    const banned = checkLegality(
      'extra',
      presentCopies('OP01-001', [{ code: 'OP06-047', quantity: 1 }]),
      rules,
    );
    expect(banned.status).toBe('illegal');
    expect(banned.banned).toEqual(['OP06-047']);

    const pair = checkLegality(
      'extra',
      presentCopies('OP11-040', [{ code: 'OP11-067', quantity: 4 }]),
      rules,
    );
    expect(pair.pairs).toEqual([['OP11-040', 'OP11-067']]);

    const leaderBan = checkLegality(
      'extra',
      presentCopies('OP03-040', []),
      rules,
    );
    expect(leaderBan.banned).toEqual(['OP03-040']);
  });

  it('does not call Standard legal while the block icon is missing', () => {
    const rules = rulesById('2026-10-12');
    const clean = checkLegality(
      'standard',
      presentCopies('OP01-001', [{ code: 'OP01-016', quantity: 4 }]),
      rules,
    );
    expect(clean.status).toBe('unchecked');
    expect(clean.blockChecked).toBe(false);

    const banned = checkLegality(
      'standard',
      presentCopies('ST10-001', []),
      rules,
    );
    expect(banned.status).toBe('illegal');
  });

  it('sums owned copies of the same code and ignores nothing about trade', () => {
    const owned = new Map([['OP01-016', 7]]);
    const result = checkAvailability(
      [{ code: 'OP01-016', quantity: 4 }],
      owned,
    );
    expect(result.available).toBe(4);
    expect(result.missingCopies).toBe(0);
    expect(result.listSize).toBe(4);

    const short = checkAvailability(
      [{ code: 'OP01-016', quantity: 4 }],
      new Map([['OP01-016', 2]]),
    );
    expect(short.rows[0]).toMatchObject({ needed: 4, owned: 2, missing: 2 });
    expect(short.available).toBe(2);
  });

  it('adds only the real wishlist gap', () => {
    const rows = [{ code: 'OP01-016', needed: 4, owned: 1 }];
    expect(wishlistAdds(rows, new Map([['OP01-016', 1]]))).toEqual([
      { code: 'OP01-016', extra: 2 },
    ]);
    expect(wishlistAdds(rows, new Map([['OP01-016', 6]]))).toEqual([]);
  });

  it('pins the 12 October 2026 list and ignores earlier dates', () => {
    expect(currentRules(new Date('2026-10-19T12:00:00Z'))?.id).toBe(
      '2026-10-12',
    );
    expect(currentRules(new Date('2026-10-11T12:00:00Z'))).toBeNull();
    expect(rulesById('2026-04-01')).toBeNull();
  });

  it('normalizes codes and prefers the base printing', () => {
    expect(
      normalizeLines([
        { code: ' op01-016 ', quantity: 2 },
        { code: 'OP01-016', quantity: 2 },
        { code: 'P', quantity: 1 },
      ]),
    ).toEqual([{ code: 'OP01-016', quantity: 4 }]);

    const chosen = pickCanonical([
      { externalId: 9, name: 'Nami (SP)' },
      { externalId: 3, name: 'Nami' },
      { externalId: 1, name: 'Nami (OP01-016) (Manga)' },
    ]);
    expect(chosen.externalId).toBe(3);
  });

  it('summarizes colors, types and the cost curve of the fifty', () => {
    const summary = deckSummary([
      {
        card: card({ code: 'OP01-016', cost: 1, colors: ['Red'] }),
        quantity: 4,
      },
      {
        card: card({
          code: 'OP01-020',
          cardType: 'Event',
          cost: 10,
          colors: ['Red', 'Green'],
        }),
        quantity: 2,
      },
      { card: leader, quantity: 1 },
    ]);
    expect(summary.colors).toEqual(
      expect.arrayContaining([
        { color: 'Red', copies: 6 },
        { color: 'Green', copies: 2 },
      ]),
    );
    expect(summary.types).toEqual([
      { cardType: 'Character', copies: 4 },
      { cardType: 'Event', copies: 2 },
    ]);
    expect(summary.curve).toEqual([
      { cost: '1', copies: 4 },
      { cost: '10+', copies: 2 },
    ]);
  });
});
