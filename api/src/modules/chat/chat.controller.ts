import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ChatService } from './chat.service.js';
import { ChatGateway } from './chat.gateway.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { SendMessageDto } from './dto/chat.dto.js';

interface AuthedUser {
  id: string;
  role: string;
}

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(
    private readonly chat: ChatService,
    private readonly chatGateway: ChatGateway,
  ) {}

  /**
   * Get or create an active conversation for the current user.
   */
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('conversations')
  @HttpCode(HttpStatus.OK)
  async getOrCreateConversation(@CurrentUser() user: AuthedUser) {
    const conversation = await this.chat.getOrCreateConversation(user.id);
    return conversation;
  }

  /**
   * Get my active conversation (user).
   */
  @Get('conversations/me')
  @HttpCode(HttpStatus.OK)
  async getMyConversation(@CurrentUser() user: AuthedUser) {
    const conversation = await this.chat.getMyConversation(user.id);
    return conversation ?? { conversation: null };
  }

  /**
   * List all conversations (god only).
   */
  @UseGuards(RolesGuard)
  @Roles('god')
  @Get('conversations')
  @HttpCode(HttpStatus.OK)
  async getConversations() {
    return this.chat.getConversationsForAdmin();
  }

  /**
   * Get messages for a conversation (owner or god).
   */
  @Get('conversations/:id/messages')
  @HttpCode(HttpStatus.OK)
  async getMessages(
    @Param('id') conversationId: string,
    @Query('cursor') cursor: string | undefined,
    @Query('limit') limit: string | undefined,
    @CurrentUser() user: AuthedUser,
  ) {
    // Anti-IDOR: validate access
    await this.chat.validateConversationAccess(
      conversationId,
      user.id,
      user.role,
    );
    const messages = await this.chat.getMessages(
      conversationId,
      cursor,
      limit ? parseInt(limit, 10) : 50,
    );
    return messages;
  }

  /**
   * Mark messages as read in a conversation (owner or god).
   */
  @Post('conversations/:id/read')
  @HttpCode(HttpStatus.OK)
  async markAsRead(
    @Param('id') conversationId: string,
    @CurrentUser() user: AuthedUser,
  ) {
    await this.chat.validateConversationAccess(
      conversationId,
      user.id,
      user.role,
    );
    await this.chat.markAsRead(conversationId, user.id);
    return { message: 'Marked as read' };
  }

  /**
   * Close a conversation (god only).
   */
  @UseGuards(RolesGuard)
  @Roles('god')
  @Patch('conversations/:id/close')
  @HttpCode(HttpStatus.OK)
  async closeConversation(@Param('id') conversationId: string) {
    const conversation = await this.chat.closeConversation(conversationId);
    return conversation;
  }

  /**
   * Send a message in a conversation via REST (admin reply).
   */
  @UseGuards(RolesGuard)
  @Roles('god')
  @Post('conversations/:id/messages')
  @HttpCode(HttpStatus.CREATED)
  async sendMessage(
    @Param('id') conversationId: string,
    @Body() dto: SendMessageDto,
    @CurrentUser() user: AuthedUser,
  ) {
    // Anti-IDOR: validate access
    await this.chat.validateConversationAccess(
      conversationId,
      user.id,
      user.role,
    );

    // Auto-assign admin
    await this.chat.ensureAdminAssigned(conversationId, user.id);

    const message = await this.chat.saveMessage({
      conversationId,
      senderId: user.id,
      senderRole: user.role as 'user' | 'god',
      content: dto.content,
    });

    // Broadcast via WebSocket agar user terima realtime
    await this.chatGateway.broadcastNewMessage(conversationId, {
      id: message.id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      senderRole: message.senderRole,
      content: message.content,
      attachmentUrl: message.attachmentUrl,
      readAt: message.readAt,
      createdAt: message.createdAt,
    });

    return message;
  }

  /**
   * Get unread message count for the current user.
   */
  @Get('unread-count')
  @HttpCode(HttpStatus.OK)
  async getUnreadCount(@CurrentUser() user: AuthedUser) {
    const count = await this.chat.getUnreadCount(user.id, user.role);
    return { count };
  }

  /**
   * Generate a one-time WebSocket ticket.
   * Requires valid JWT (the BFF proxy will attach Authorization header).
   */
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('ws-ticket')
  @HttpCode(HttpStatus.OK)
  async generateWsTicket(@CurrentUser() user: AuthedUser) {
    const ticket = this.chat.generateTicket(user.id, user.role);
    return { ticket };
  }
}
