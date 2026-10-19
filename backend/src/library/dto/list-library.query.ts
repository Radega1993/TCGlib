import { IsIn, IsOptional } from 'class-validator';
import { LibraryList } from '../schemas/library-entry.schema';

export class ListLibraryQueryDto {
  @IsOptional()
  @IsIn(['owned', 'wanted'])
  list?: LibraryList;
}
