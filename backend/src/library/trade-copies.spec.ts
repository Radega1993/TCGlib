import { availableCopies, reservedCopies } from './trade-copies';

describe('copias para intercambio', () => {
  it('no convierte las copias de más en intercambiables', () => {
    expect(availableCopies(7, 0)).toBe(0);
    expect(reservedCopies(7, 0)).toBe(7);
  });

  it('separa reservadas y disponibles según lo marcado', () => {
    expect(availableCopies(7, 2)).toBe(2);
    expect(reservedCopies(7, 2)).toBe(5);
  });

  it('no ofrece más copias de las que hay en la biblioteca', () => {
    expect(availableCopies(4, 9)).toBe(4);
    expect(reservedCopies(4, 9)).toBe(0);
  });
});
