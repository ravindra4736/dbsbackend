import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdatePageDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(191)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(191)
  slug?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  content?: string;

  @IsOptional()
  @IsString()
  @MaxLength(191)
  seoTitle?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  seoDescription?: string | null;
}
