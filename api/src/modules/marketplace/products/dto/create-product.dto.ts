import {
  IsString,
  IsInt,
  Min,
  IsOptional,
  IsBoolean,
  MaxLength,
} from 'class-validator';

export class CreateProductDto {
  @IsString()
  @MaxLength(200)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsInt()
  @Min(0)
  priceCents: number;

  @IsInt()
  @Min(1)
  keysPerUnit: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  warrantyPeriodDays?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxWarrantyClaims?: number;

  // Images are deferred; keep a single optional URL field.
  @IsOptional()
  @IsString()
  @MaxLength(500)
  imageUrl?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;
}
