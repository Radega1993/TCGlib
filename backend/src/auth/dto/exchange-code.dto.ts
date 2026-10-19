import { IsString, MaxLength, MinLength } from 'class-validator';

export class ExchangeCodeDto {
  @IsString()
  @MinLength(20)
  @MaxLength(200)
  code: string;
}
