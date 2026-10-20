import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Min } from 'class-validator';
import { ListProductsQueryDto } from '../../catalog/products/dto/list-products.query';

export const SHARE_TABS = ['biblioteca', 'intercambio', 'busco'] as const;
export type ShareTab = (typeof SHARE_TABS)[number];

export class ShareCollectionQueryDto extends ListProductsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  wanted?: number;

  @IsOptional()
  @IsIn(SHARE_TABS)
  tab?: ShareTab;
}
