import { IsIn } from 'class-validator';

export class ResetShareDto {
  @IsIn(['library', 'wanted', 'trades'])
  list: 'library' | 'wanted' | 'trades';
}
