import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CancelOrderDto {
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Alasan tidak boleh kosong' })
  @MaxLength(4000, { message: 'Alasan maksimal 4000 karakter' })
  reason?: string;
}
