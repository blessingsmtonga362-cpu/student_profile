import { PartialType } from '@nestjs/mapped-types';
import { PrimaryEducationDto } from './primary-education.dto';
import { SecondaryEducationDto } from './secondary-education.dto';
import { TertiaryEducationDto } from './tertiary-education.dto';

export class UpdateEducationDto extends PartialType(PrimaryEducationDto) {}
export class UpdateSecondaryEducationDto extends PartialType(SecondaryEducationDto) {}
export class UpdateTertiaryEducationDto extends PartialType(TertiaryEducationDto) {}