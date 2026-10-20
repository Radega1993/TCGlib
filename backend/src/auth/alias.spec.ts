import { BadRequestException } from '@nestjs/common';
import { parseAlias, publicPlayerName } from './alias';

describe('parseAlias', () => {
  it('acepta un alias y limpia espacios', () => {
    expect(parseAlias('  Luffy  OP ')).toBe('Luffy OP');
  });

  it('trata el vacío como quitar el alias', () => {
    expect(parseAlias('   ')).toBeNull();
  });

  it('no usa un email como nombre público', () => {
    expect(publicPlayerName({ name: 'yo@mail.com', alias: 'Radega' })).toBe('Radega');
    expect(publicPlayerName({ name: 'yo@mail.com' })).toBe('Jugador');
    expect(publicPlayerName({ name: 'Raul' })).toBe('Raul');
  });

  it('rechaza un carácter o un email', () => {
    expect(() => parseAlias('a')).toThrow(BadRequestException);
    expect(() => parseAlias('yo@mail.com')).toThrow(BadRequestException);
  });
});
