import { IsString, IsIn, MaxLength } from 'class-validator';

export class RequestUploadDto {
  @IsString()
  @IsIn(['product-image', 'payment-proof', 'payment-method-image'], {
    message: 'Purpose harus product-image, payment-proof, atau payment-method-image',
  })
  purpose: 'product-image' | 'payment-proof' | 'payment-method-image';

  @IsString()
  @MaxLength(255)
  fileName: string;

  @IsString()
  @IsIn(['image/jpeg', 'image/png', 'image/webp'], {
    message: 'Tipe file harus jpeg, png, atau webp',
  })
  contentType: string;
}
