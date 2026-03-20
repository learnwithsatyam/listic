import { IsString, IsBoolean, IsArray, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateProjectDto {
  @IsString()
  productName: string;

  @IsString()
  productCategory: string;

  @Transform(({ value }) => {
    if (typeof value === 'string') return value === 'true';
    return Boolean(value);
  })
  @IsBoolean()
  isWearable: boolean;

  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try { return JSON.parse(value); } catch { return [value]; }
    }
    return value;
  })
  @IsArray()
  @IsString({ each: true })
  targetPlatforms: string[];
}

export class GenerateImagesDto {
  @IsString()
  projectId: string;

  @IsOptional()
  @IsString()
  additionalPrompt?: string;
}
