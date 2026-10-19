import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

function emptyToUndefined({ value }: { value: unknown }) {
  if (typeof value !== 'string') {
    return value;
  }
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

function toStringList({ value }: { value: unknown }) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  const raw = Array.isArray(value) ? value : [value];
  const items = [
    ...new Set(
      raw
        .flatMap((item) => (typeof item === 'string' ? item.split(',') : []))
        .map((item) => item.trim())
        .filter((item) => item.length > 0),
    ),
  ];
  return items.length ? items : undefined;
}

export class ListProductsQueryDto {
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(80)
  tcg?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsIn(['card', 'sealed', 'accessory', 'other'])
  type?: 'card' | 'sealed' | 'accessory' | 'other';

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(160)
  set?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(120)
  q?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(40)
  code?: string;

  @IsOptional()
  @Transform(toStringList)
  @IsArray()
  @ArrayMaxSize(8)
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  color?: string[];

  @IsOptional()
  @Transform(toStringList)
  @IsArray()
  @ArrayMaxSize(12)
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  rarity?: string[];

  @IsOptional()
  @Transform(toStringList)
  @IsArray()
  @ArrayMaxSize(8)
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  cardType?: string[];

  @IsOptional()
  @Transform(toStringList)
  @IsArray()
  @ArrayMaxSize(8)
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  attribute?: string[];

  @IsOptional()
  @Transform(toStringList)
  @IsArray()
  @ArrayMaxSize(12)
  @IsString({ each: true })
  @MaxLength(8, { each: true })
  cost?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
