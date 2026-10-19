import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export class UpdateTradeDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  externalId: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(99)
  forTrade: number;
}
