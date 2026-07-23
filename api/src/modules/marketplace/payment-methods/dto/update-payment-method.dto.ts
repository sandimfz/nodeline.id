import {
  IsString,
  IsIn,
  IsOptional,
  IsBoolean,
  IsInt,
  MaxLength,
} from 'class-validator';

export class UpdatePaymentMethodDto {
  @IsOptional()
  @IsString()
  @IsIn(['bank_transfer', 'qris'], {
    message: 'Tipe harus bank_transfer atau qris',
  })
  type?: 'bank_transfer' | 'qris';

  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  imageUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  accountNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  accountName?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
