import { IsString, IsOptional, IsEnum, IsBoolean, IsInt, Min, Matches, MaxLength, IsUrl, IsArray } from 'class-validator';
import { Transform, Type } from 'class-transformer';

// ─── Query DTO ─────────────────────────────────────────────

export class ListServicesQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;
}

// ─── Admin DTOs ────────────────────────────────────────────

export class CreateServiceDto {
  @IsString()
  @Matches(/^[a-z0-9-]+$/, { message: 'Slug harus lowercase alphanumeric + dash' })
  @MaxLength(100)
  slug!: string;

  @IsString()
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  shortDescription?: string;

  @IsString()
  @MaxLength(50)
  category!: string;

  @IsString()
  @MaxLength(500)
  baseUrl!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  logoUrl?: string;

  @IsOptional()
  @IsEnum(['FREE', 'FREEMIUM', 'PAID'])
  pricingType?: 'FREE' | 'FREEMIUM' | 'PAID';

  @IsOptional()
  @IsEnum(['ACTIVE', 'MAINTENANCE', 'DEPRECATED'])
  status?: 'ACTIVE' | 'MAINTENANCE' | 'DEPRECATED';

  @IsOptional()
  @IsString()
  @MaxLength(20)
  version?: string;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;
}

export class UpdateServiceDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  shortDescription?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  baseUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  logoUrl?: string;

  @IsOptional()
  @IsEnum(['FREE', 'FREEMIUM', 'PAID'])
  pricingType?: 'FREE' | 'FREEMIUM' | 'PAID';

  @IsOptional()
  @IsEnum(['ACTIVE', 'MAINTENANCE', 'DEPRECATED'])
  status?: 'ACTIVE' | 'MAINTENANCE' | 'DEPRECATED';

  @IsOptional()
  @IsString()
  @MaxLength(20)
  version?: string;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;
}

export class CreateEndpointDto {
  @IsEnum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])
  method!: string;

  @IsString()
  @MaxLength(200)
  path!: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  summary?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  requestExample?: unknown;

  @IsOptional()
  responseExample?: unknown;

  @IsOptional()
  @IsBoolean()
  isPremium?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;
}

export class CreatePlanDto {
  @IsString()
  @MaxLength(50)
  name!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  priceCents!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  requestsPerDay?: number; // null = unlimited

  @Type(() => Number)
  @IsInt()
  @Min(1)
  requestsPerMinute!: number;

  @IsOptional()
  @IsArray()
  features?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;
}

// ─── Subscribe DTO ─────────────────────────────────────────

export class SubscribeDto {
  @IsOptional()
  @IsString()
  planName?: string; // defaults to FREE if not specified
}
