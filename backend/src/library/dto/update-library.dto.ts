import { Type } from 'class-transformer';
import { IsIn, IsInt, Max, Min } from 'class-validator';
import { LibraryList } from '../schemas/library-entry.schema';

export class UpdateLibraryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  externalId: number;

  @IsIn(['owned', 'wanted'])
  list: LibraryList;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(99)
  quantity: number;
}
