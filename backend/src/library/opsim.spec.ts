import { assembleOpsim, OpsimError, parseOpsim } from './opsim';

const TEXT = `1xOP02-068_r1
1xOP12-037_p1
1xOP15-032_p1
1xOP16-022_p1
2xOP16-026_p1
2xOP16-032_p2
4xOP16-034_p2
2xOP16-038
7xOP16-042_p1
4xOP16-045
4xOP16-048_p1
4xOP16-054
4xOP16-055_p1
4xOP16-056_p1
3xST30-014
`;

const JSON_DECK = `{
  "metadata": {
    "name": "OP16-022_p1 Green Blue by Beton1996 - copy",
    "author": "b00n"
  },
  "deck": {
    "Main Deck": [
      { "id": "OP02-068_r1", "count": 1 },
      { "id": "OP12-037_p1", "count": 1 },
      { "id": "OP15-032_p1", "count": 1 },
      { "id": "OP16-022_p1", "count": 1 },
      { "id": "OP16-026_p1", "count": 2 },
      { "id": "OP16-032_p2", "count": 2 },
      { "id": "OP16-034_p2", "count": 4 },
      { "id": "OP16-038", "count": 2 },
      { "id": "OP16-042_p1", "count": 7 },
      { "id": "OP16-045", "count": 4 },
      { "id": "OP16-048_p1", "count": 4 },
      { "id": "OP16-054", "count": 4 },
      { "id": "OP16-055_p1", "count": 4 },
      { "id": "OP16-056_p1", "count": 4 },
      { "id": "ST30-014", "count": 3 }
    ]
  }
}`;

function typesOf(leader = 'OP16-022') {
  const types = new Map<string, string | null>();
  types.set(leader, 'Leader');
  return types;
}

describe('OP Sim', () => {
  it('reads text, strips the printing suffix and sums the same card', () => {
    const parsed = parseOpsim(`1xOP02-068_r1\n2xop02-068\n`);
    expect(parsed.cards).toEqual([
      { code: 'OP02-068', quantity: 3, role: 'main' },
    ]);
  });

  it('reads the sample text and JSON as the same card list', () => {
    const text = parseOpsim(TEXT);
    const json = parseOpsim(JSON_DECK);
    expect(json.name).toBe('OP16-022_p1 Green Blue by Beton1996 - copy');
    expect(json.cards.map(({ code, quantity }) => [code, quantity])).toEqual(
      text.cards.map(({ code, quantity }) => [code, quantity]),
    );
    expect(text.cards.find((card) => card.code === 'OP16-042')?.quantity).toBe(
      7,
    );
  });

  it('keeps a leader out of the 50 and preserves copies above 4', () => {
    const assembled = assembleOpsim(parseOpsim(TEXT), typesOf());
    expect(assembled.leaderCode).toBe('OP16-022');
    expect(
      assembled.lines.find((line) => line.code === 'OP16-022'),
    ).toBeUndefined();
    expect(assembled.lines.find((line) => line.code === 'OP16-042')).toEqual({
      code: 'OP16-042',
      quantity: 7,
    });
    expect(assembled.notes.some((note) => note.includes('OP16-042 (7)'))).toBe(
      true,
    );
    expect(assembled.lines.reduce((sum, line) => sum + line.quantity, 0)).toBe(
      43,
    );
  });

  it('uses a Leader section and skips DON!!', () => {
    const parsed = parseOpsim(
      JSON.stringify({
        deck: {
          Leader: [{ id: 'OP01-001', count: 1 }],
          'Main Deck': [
            { id: 'OP01-016', count: 4 },
            { id: 'OP01-001', count: 1 },
          ],
          'DON!!': [{ id: 'DON-001', count: 10 }],
        },
      }),
    );
    const assembled = assembleOpsim(
      parsed,
      new Map([
        ['OP01-001', 'Leader'],
        ['OP01-016', 'Character'],
      ]),
    );
    expect(assembled.leaderCode).toBe('OP01-001');
    expect(assembled.lines).toEqual([{ code: 'OP01-016', quantity: 4 }]);
    expect(assembled.notes.some((note) => note.includes('DON!!'))).toBe(true);
  });

  it('leaves unknown codes in the list and drops extra leaders', () => {
    const assembled = assembleOpsim(
      parseOpsim('1xOP01-001\n1xOP01-002\n4xNOPE-999\n'),
      new Map([
        ['OP01-001', 'Leader'],
        ['OP01-002', 'Leader'],
        ['NOPE-999', null],
      ]),
    );
    expect(assembled.leaderCode).toBe('OP01-001');
    expect(assembled.lines.map((line) => line.code)).toEqual(['NOPE-999']);
    expect(assembled.notes.some((note) => note.includes('OP01-002'))).toBe(
      true,
    );
    expect(assembled.notes.some((note) => note.includes('NOPE-999'))).toBe(
      true,
    );
  });

  it('rejects a file without cards', () => {
    expect(() => parseOpsim('   ')).toThrow(OpsimError);
    expect(() => parseOpsim('{')).toThrow('Ese JSON no es un mazo de OP Sim.');
    expect(() =>
      assembleOpsim(parseOpsim('# solo un comentario'), new Map()),
    ).toThrow('No encuentro cartas en ese mazo.');
  });
});
