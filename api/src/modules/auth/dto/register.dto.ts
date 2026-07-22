import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'Format email tidak valid' })
  email: string;

  @IsString()
  @MinLength(8, { message: 'Password minimal 8 karakter' })
  @MaxLength(64)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*$/, {
    message: 'Password wajib mengandung huruf besar, huruf kecil, dan angka',
  })
  password: string;

  @IsString()
  @MinLength(2)
  @MaxLength(50)
  name: string;
}

/**
 * DTO for updating profile. Only `name` is allowed; `whitelist: true` + `forbidNonWhitelisted: true`
 * on the global ValidationPipe will strip/reject any other fields (email, role, etc.).
 * This prevents mass-assignment / parameter pollution server-side.
 */
export class UpdateProfileDto {
  @IsString()
  @MinLength(2, { message: 'Nama minimal 2 karakter' })
  @MaxLength(50, { message: 'Nama maksimal 50 karakter' })
  name: string;
}
