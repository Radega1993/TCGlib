import { Transform } from 'class-transformer';
import { IsString, MaxLength } from 'class-validator';

export class UpdateAliasDto {
  @Transform(({ value }) => (typeof value === 'string' ? value : ''))
  @IsString()
  @MaxLength(24)
  alias: string;
}
