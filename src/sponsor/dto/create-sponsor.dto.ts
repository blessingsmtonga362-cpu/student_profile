import { Transform } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateSponsorDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name!: string;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  requestedSlots!: number;

  @IsOptional()
  @IsString()
  logoUrl?: string;
}
