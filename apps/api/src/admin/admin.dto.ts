import { IsBoolean, IsInt, IsOptional, Min, Max, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateCreditsDto {
  @IsInt()
  @Min(0)
  @Max(100000)
  credits: number;
}

export class ToggleAdminDto {
  @IsBoolean()
  isAdmin: boolean;
}

export class RevenueQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2020)
  @Max(2100)
  year?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;
}

export class MonthlyRevenueQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2020)
  @Max(2100)
  year?: number;
}
