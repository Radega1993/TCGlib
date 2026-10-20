import {
  isCommunityList,
  leadersNeedingDecks,
  pickNewVariants,
  readCommunityDeck,
} from './community-decks';

const SAMPLE = {
  slug: 'east-op12-blue-kuzan-q1t32',
  fingerprint: 'dbf3bdfb7c709738db80efba34a52ebe',
  humanname: 'East OP12 Blue Kuzan',
  authornick: 'Raphterra',
  leader: 'OP12-040',
  format: 'OP12',
  views: '52132940',
  date: '1751195361',
  price: 1.81,
  deck: {
    'OP12-040': '1',
    'OP12-043': '4',
    'op06-050': '4',
    DON: '10',
  },
};

describe('readCommunityDeck', () => {
  it('guarda el líder aparte y descarta códigos que no son cartas', () => {
    const deck = readCommunityDeck(SAMPLE);
    expect(deck).toMatchObject({
      slug: SAMPLE.slug,
      name: 'East OP12 Blue Kuzan',
      author: 'Raphterra',
      leaderCode: 'OP12-040',
      meta: 'OP12',
      views: 52132940,
      lines: [
        { code: 'OP12-043', quantity: 4 },
        { code: 'OP06-050', quantity: 4 },
      ],
    });
    expect(deck?.publishedAt.toISOString()).toBe('2025-06-29T11:09:21.000Z');
  });

  it('rechaza una lista sin líder o sin cartas', () => {
    expect(readCommunityDeck({ ...SAMPLE, leader: 'no-es-carta' })).toBeNull();
    expect(readCommunityDeck({ ...SAMPLE, deck: { 'OP12-040': '1' } })).toBeNull();
  });

  it('junta las versiones alternativas con la carta base', () => {
    const deck = readCommunityDeck({
      ...SAMPLE,
      leader: 'OP12-040_p1',
      deck: { 'OP12-040_p1': '1', 'OP06-050_r1': '2', 'OP06-050': '2' },
    });
    expect(deck?.leaderCode).toBe('OP12-040');
    expect(deck?.lines).toEqual([{ code: 'OP06-050', quantity: 4 }]);
  });
});

describe('isCommunityList', () => {
  it('acepta una lista de 50 y descarta un borrador corto', () => {
    const full = deck('lleno', 'OP12-040', 1);
    full.lines = [{ code: 'OP01-001', quantity: 50 }];
    expect(isCommunityList(full)).toBe(true);
    expect(isCommunityList(deck('corto', 'OP12-040', 1))).toBe(false);
  });
});

describe('leadersNeedingDecks', () => {
  it('pide líderes del catálogo que aún no tienen tres listas', () => {
    const needing = leadersNeedingDecks(
      ['OP16-079', 'OP12-040', 'OP12-020'],
      [
        { leaderCode: 'OP12-040' },
        { leaderCode: 'OP12-040' },
        { leaderCode: 'OP12-040' },
        { leaderCode: 'OP12-020' },
      ],
    );
    expect(needing).toEqual(['OP16-079', 'OP12-020']);
  });
});

describe('pickNewVariants', () => {
  const stored = [
    {
      slug: 'kuzan-1',
      fingerprint: 'fp-kuzan-1',
      leaderCode: 'OP12-040',
    },
  ];

  it('completa hasta tres listas por líder y no repite las guardadas', () => {
    const incoming = [1, 2, 3, 4].map((index) =>
      deck(`kuzan-${index}`, 'OP12-040', index),
    );
    incoming.push(deck('zoro-1', 'OP12-020', 9));
    const picked = pickNewVariants(incoming, stored);
    expect(picked.kept).toBe(1);
    expect(picked.fresh.map((item) => item.slug)).toEqual([
      'zoro-1',
      'kuzan-4',
      'kuzan-3',
    ]);
  });
});

function deck(slug: string, leaderCode: string, views: number) {
  return {
    slug,
    fingerprint: `fp-${slug}`,
    name: slug,
    author: 'Comunidad',
    leaderCode,
    lines: [{ code: 'OP01-001', quantity: 4 }],
    meta: 'OP12',
    views,
    publishedAt: new Date('2025-06-29T11:09:21.000Z'),
  };
}
