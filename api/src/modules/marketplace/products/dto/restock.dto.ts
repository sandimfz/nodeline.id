import { IsString, MinLength } from 'class-validator';

export class RestockTextDto {
  // Raw pasted .txt body: one line per key/link. Will be chunked by
  // product.keysPerUnit. The number of non-empty lines must be a multiple.
  @IsString()
  @MinLength(1, { message: 'Konten restock tidak boleh kosong' })
  content: string;
}

export class ManualUnitDto {
  // Single unit content (e.g. one custom link) added by hand.
  @IsString()
  @MinLength(1, { message: 'Konten tidak boleh kosong' })
  content: string;
}
