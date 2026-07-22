import { IsString, IsIn, MaxLength } from 'class-validator';

export class RequestUploadDto {
  @IsString()
  @IsIn(['product-image', 'payment-proof'], {
    message: 'Purpose harus product-image atau payment-proof',
  })
  purpose: 'product-image' | 'payment-proof';

  @IsString()
  @MaxLength(255)
  fileName: string;

  @IsString()
  @IsIn(['image/jpeg', 'image/png', 'image/webp'], {
    message: 'Tipe file harus jpeg, png, atau webp',
  })
  contentType: string;
}
