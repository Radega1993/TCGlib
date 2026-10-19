import { buildProductFilter, orderValues } from './product-filter';

describe('buildProductFilter', () => {
  it('matches a color inside multicolor cards', () => {
    expect(buildProductFilter({ type: 'card', color: ['Red'] })).toMatchObject({
      type: 'card',
      $or: [{ color: { $regex: '(^|;)Red(;|$)' } }],
    });
  });

  it('combines search, color and attribute without dropping exact filters', () => {
    const filter = buildProductFilter({
      q: 'Luffy',
      color: ['Red', 'Blue'],
      rarity: ['SR'],
      cardType: ['Character'],
      attribute: ['Slash'],
      cost: ['5'],
      set: 'set-1',
    });

    expect(filter.rarity).toEqual({ $in: ['SR'] });
    expect(filter.cardType).toEqual({ $in: ['Character'] });
    expect(filter.cost).toEqual({ $in: ['5'] });
    expect(filter['set.externalId']).toBe('set-1');
    expect(filter.$and).toHaveLength(3);
  });

  it('escapes regex characters in the search', () => {
    const filter = buildProductFilter({ q: 'a.b' });
    const clause = filter.$or as { name: { $regex: string } }[];
    expect(clause[0].name.$regex).toBe('a\\.b');
  });
});

describe('orderValues', () => {
  it('keeps the preferred order and appends unknown values', () => {
    expect(orderValues(['SR', 'Promo', 'C'], ['C', 'UC', 'R', 'SR'])).toEqual([
      'C',
      'SR',
      'Promo',
    ]);
  });
});
