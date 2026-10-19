import { BadRequestException } from '@nestjs/common';

const ALIAS = /^[\p{L}\p{N}]+(?:[ ._'-][\p{L}\p{N}]+)*$/u;

export function parseAlias(value: string) {
  const alias = value.trim().replace(/\s+/g, ' ');
  if (!alias) return null;
  if (alias.length < 2 || alias.length > 24 || !ALIAS.test(alias)) {
    throw new BadRequestException(
      'El alias tiene que tener entre 2 y 24 caracteres: letras, números y espacios',
    );
  }
  return alias;
}

export function displayName(user: { name: string; alias?: string | null }) {
  return user.alias?.trim() || user.name;
}
