import { ApitcgProduct } from '../apitcg/apitcg.types';
import { mapProduct } from './map-catalog';

describe('mapProduct', () => {
  const syncedAt = new Date('2026-10-19T08:00:00.000Z');

  const luffy: ApitcgProduct = {
    _id: 9804,
    type: 'card',
    name: 'Monkey.D.Luffy',
    tcg: { _id: 'one-piece', name: 'One Piece' },
    set: {
      _id: 'one-piece-pillars-of-strength',
      name: 'Pillars of Strength',
      slug: 'pillars-of-strength',
      tcg: 'one-piece',
      code: 'OP03',
    },
    code: 'OP03-070',
    images: [
      {
        small: 'https://example.test/small.jpg',
        medium: 'https://example.test/medium.jpg',
        large: 'https://example.test/large.jpg',
      },
    ],
    attributes: {
      Rarity: 'R',
      Number: 'OP03-070',
      Color: 'Purple',
      CardType: 'Character',
      Cost: '6',
      Power: '7000',
      Subtypes: 'Straw Hat Crew',
      Attribute: 'Strike',
      Artist: 'Nekobayashi',
    },
    markets: {
      tcgplayer: {
        id: '500009',
        prices: { market: 0.25 },
        printing: 'Foil',
      },
    },
    createdAt: '2026-03-25T22:37:10.800Z',
    updatedAt: '2026-10-18T04:11:47.502Z',
  };

  it('promotes One Piece attributes used by the library filters', () => {
    const record = mapProduct(luffy, syncedAt);

    expect(record).toMatchObject({
      externalId: 9804,
      type: 'card',
      name: 'Monkey.D.Luffy',
      tcgSlug: 'one-piece',
      code: 'OP03-070',
      rarity: 'R',
      color: 'Purple',
      cardType: 'Character',
      cost: '6',
      power: '7000',
      artist: 'Nekobayashi',
      cardNumber: 'OP03-070',
      subtypes: 'Straw Hat Crew',
      cardAttribute: 'Strike',
      syncedAt,
      set: {
        externalId: 'one-piece-pillars-of-strength',
        name: 'Pillars of Strength',
        slug: 'pillars-of-strength',
        code: 'OP03',
      },
    });
    expect(record.markets?.tcgplayer?.prices?.market).toBe(0.25);
  });
});
