import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateAdminUserDto {
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value : value))
  @IsString()
  @MaxLength(24)
  alias?: string;

  @IsOptional()
  @IsBoolean()
  shareEnabled?: boolean;
}
