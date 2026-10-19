import { BadRequestException } from '@nestjs/common';
import { parseAlias } from './alias';

describe('parseAlias', () => {
  it('acepta un alias y limpia espacios', () => {
    expect(parseAlias('  Luffy  OP ')).toBe('Luffy OP');
  });

  it('trata el vacío como quitar el alias', () => {
    expect(parseAlias('   ')).toBeNull();
  });

  it('rechaza un carácter o un email', () => {
    expect(() => parseAlias('a')).toThrow(BadRequestException);
    expect(() => parseAlias('yo@mail.com')).toThrow(BadRequestException);
  });
});
