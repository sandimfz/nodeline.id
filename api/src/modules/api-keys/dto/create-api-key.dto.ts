import { IsOptional, IsString, IsEnum, MaxLength, MinLength } from 'class-validator';

export class CreateApiKeyDto {
  @IsString()
  @MinLength(1, { message: 'Nama key tidak boleh kosong' })
  @MaxLength(100, { message: 'Nama key maksimal 100 karakter' })
  name: string;

  @IsOptional()
  @IsEnum(['FREE', 'PRO', 'ENTERPRISE'])
  plan?: 'FREE' | 'PRO' | 'ENTERPRISE';
}
