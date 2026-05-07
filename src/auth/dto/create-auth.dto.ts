import { Transform } from 'class-transformer';
import { IsEmail, IsString, Matches, MinLength } from 'class-validator';

export class CreateAuthDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @Matches(/@unima\.ac\.mw$/i, {
    message: 'Only University of Malawi email addresses are allowed',
  })
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;
}
