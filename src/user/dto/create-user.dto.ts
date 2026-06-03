import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty({ message: 'firstName should not be empty' })
  firstName!: string;

  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty({ message: 'lastName should not be empty' })
  lastName!: string;

  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsNotEmpty({ message: 'email should not be empty' })
  @IsEmail()
  @Matches(/@unima\.ac\.mw$/i, {
    message: 'Only University of Malawi email addresses are allowed',
  })
  email!: string;

  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty({ message: 'password should not be empty' })
  @MinLength(8, { message: 'Password must be at least 8 characters.' })
  @Matches(/[A-Z]/, { message: 'Password must contain at least one uppercase letter.' })
  @Matches(/[0-9]/, { message: 'Password must contain at least one number.' })
  @Matches(/[^A-Za-z0-9]/, { message: 'Password must contain at least one symbol.' })
  password!: string;
}
