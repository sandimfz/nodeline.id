import {
  IsUUID,
  IsInt,
  Min,
  IsPhoneNumber,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CheckoutItemDto {
  @IsUUID()
  productId: string;

  @IsInt()
  @Min(1)
  quantity: number;
}

export class CheckoutDto {
  @IsPhoneNumber('ID', { message: 'Nomor WhatsApp tidak valid' })
  whatsappNumber: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  paymentNote?: string;

  @ValidateNested({ each: true })
  @Type(() => CheckoutItemDto)
  @ArrayMinSize(1, { message: 'Minimal 1 item untuk checkout' })
  items: CheckoutItemDto[];
}
