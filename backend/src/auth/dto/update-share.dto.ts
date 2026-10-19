import { IsBoolean } from 'class-validator';

export class UpdateShareDto {
  @IsBoolean()
  enabled: boolean;
}
