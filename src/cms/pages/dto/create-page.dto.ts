import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreatePageDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(1)
  @MaxLength(191)
  title: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(1)
  content: string;

  @IsOptional()
  @IsString()
  @MaxLength(191)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(191)
  seoTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  seoDescription?: string;
}
