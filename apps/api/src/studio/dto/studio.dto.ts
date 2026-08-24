import {
  IsString,
  IsOptional,
  IsIn,
  IsArray,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

const FORMAT_SLUGS = ['square', 'portrait', 'story', 'landscape'];

export class UploadBackgroundDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name: string;
}

export class GenerateBackgroundDto {
  @IsString()
  @MinLength(4)
  @MaxLength(600)
  prompt: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsIn(FORMAT_SLUGS)
  format?: string;
}

export class CreateShootDto {
  @IsString()
  backgroundId: string;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name: string;

  @IsOptional()
  @IsIn(FORMAT_SLUGS)
  format?: string;

  @IsOptional()
  @IsString()
  @MaxLength(600)
  stylePrompt?: string;

  /**
   * Dish names, positionally matched to the uploaded `images`. Arrives as a
   * JSON string because the request is multipart/form-data.
   */
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [value];
      } catch {
        return [value];
      }
    }
    return value;
  })
  @IsArray()
  @IsString({ each: true })
  dishNames: string[];
}
