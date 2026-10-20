import { IsIn, IsOptional } from 'class-validator';
import { ListProductsQueryDto } from '../../catalog/products/dto/list-products.query';
import { LibraryList } from '../schemas/library-entry.schema';

export class ListLibraryQueryDto extends ListProductsQueryDto {
  @IsOptional()
  @IsIn(['owned', 'wanted'])
  list?: LibraryList;
}
