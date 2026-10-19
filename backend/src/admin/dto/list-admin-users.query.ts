import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

const emptyToUndefined = ({ value }: { value: unknown }) =>
  value === '' ? undefined : value;

export class ListAdminUsersQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsIn(['blocked', 'sharing', 'active'])
  status?: 'blocked' | 'sharing' | 'active';

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsIn(['recent', 'activity', 'name'])
  sort?: 'recent' | 'activity' | 'name';
}
