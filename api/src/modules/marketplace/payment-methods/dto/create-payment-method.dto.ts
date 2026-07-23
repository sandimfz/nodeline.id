import {
  IsString,
  IsIn,
  IsOptional,
  IsBoolean,
  IsInt,
  MaxLength,
} from 'class-validator';

export class CreatePaymentMethodDto {
  @IsString()
  @IsIn(['bank_transfer', 'qris'], {
    message: 'Tipe harus bank_transfer atau qris',
  })
  type: 'bank_transfer' | 'qris';

  @IsString()
  @MaxLength(200)
  name: string;

  @IsString()
  @MaxLength(500)
  imageUrl: string;

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
