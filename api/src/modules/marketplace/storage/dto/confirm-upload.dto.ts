import { IsString, IsOptional, IsUUID } from 'class-validator';

export class ConfirmUploadDto {
  /**
   * The R2 object key returned from the request-upload endpoint.
   */
  @IsString()
  fileKey: string;

  /**
   * For product-image: the product ID to attach the image to.
   */
  @IsOptional()
  @IsUUID()
  productId?: string;

  /**
   * For payment-proof: the order ID to attach the proof to.
   */
  @IsOptional()
  @IsUUID()
  orderId?: string;
}
