import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class GetMediaQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(['image', 'video', 'audio', 'document'])
  type?: 'image' | 'video' | 'audio' | 'document';

  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsString()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}

/**
 * WordPress-style attachment metadata.
 * Uses media.upload permission (no separate media.update).
 */
export class UpdateMediaDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  altText?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  caption?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string | null;
}
