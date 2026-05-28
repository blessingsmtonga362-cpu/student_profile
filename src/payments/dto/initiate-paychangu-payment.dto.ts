import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNumber,
  IsString,
  IsUrl,
  IsUUID,
  Min,
} from 'class-validator';

export class InitiatePaychanguPaymentDto {
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  amount: number;

  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  studentIds: string[];

  @IsString()
  @IsUrl({ require_tld: false })
  returnUrl: string;

  @IsString()
  @IsUrl({ require_tld: false })
  cancelUrl: string;
}
