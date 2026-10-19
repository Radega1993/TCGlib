import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';
import { ListProductsQueryDto } from '../../catalog/products/dto/list-products.query';

export class ShareCollectionQueryDto extends ListProductsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  wanted?: number;
}
