import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';

/**
 * Create or get active conversation for the current user.
 */
export class CreateConversationDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  initialMessage?: string;
}

/**
 * Send a message in a conversation.
 */
export class SendMessageDto {
  @IsString()
  @MinLength(1, { message: 'Pesan tidak boleh kosong' })
  @MaxLength(4000, { message: 'Pesan maksimal 4000 karakter' })
  content: string;
}

/**
 * Generate a one-time WebSocket ticket.
 */
export class WsTicketDto {
  @IsString()
  userId: string;

  @IsString()
  role: string;
}
