import { Type } from 'class-transformer';
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
import {
  COLLECTION_MODES,
  COLLECTION_VIEWS,
  CollectionMode,
  CollectionView,
} from '../collection-progress';

export class UpdateCollectionGoalDto {
  @IsIn(COLLECTION_MODES)
  mode: CollectionMode;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(99)
  customCopies: number;

  @IsArray()
  @ArrayMaxSize(200)
  @IsString({ each: true })
  @MaxLength(120, { each: true })
  excludedVariants: string[];
}

export class CollectionSetQueryDto {
  @IsOptional()
  @IsIn(COLLECTION_VIEWS)
  view?: CollectionView;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;
}
