import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { DECK_FORMATS, DeckFormat } from '../deck-rules';

const CODE = /^[A-Z]{1,4}\d{0,2}-\d{3}$/;

export class DeckLineDto {
  @IsString()
  @Matches(CODE)
  code: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(99)
  quantity: number;
}

export class SaveDeckDto {
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  name: string;

  @IsIn(DECK_FORMATS)
  format: DeckFormat;

  @IsOptional()
  @IsString()
  @Matches(CODE)
  leaderCode?: string;

  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => DeckLineDto)
  lines: DeckLineDto[];
}

export class CreateDeckDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  name?: string;

  @IsOptional()
  @IsIn(DECK_FORMATS)
  format?: DeckFormat;
}

export class ImportDeckDto {
  @IsString({ message: 'Pega un mazo en texto o JSON.' })
  @MinLength(1, { message: 'Pega un mazo en texto o JSON.' })
  @MaxLength(20000, { message: 'Ese mazo es demasiado largo.' })
  source: string;
}

export class SearchDeckQueryDto {
  @IsString()
  @MinLength(2)
  @MaxLength(40)
  q: string;

  @IsIn(['leader', 'card'])
  role: 'leader' | 'card';
}
