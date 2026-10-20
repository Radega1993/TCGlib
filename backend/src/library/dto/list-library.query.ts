import { IsIn, IsOptional } from 'class-validator';
import { ListProductsQueryDto } from '../../catalog/products/dto/list-products.query';

export class ListLibraryQueryDto extends ListProductsQueryDto {
  @IsOptional()
  @IsIn(['owned', 'wanted', 'trade'])
  list?: 'owned' | 'wanted' | 'trade';
}
