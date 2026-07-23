export interface Conversation {
  id: string;
  userId: string;
  assignedAdminId: string | null;
  status: "OPEN" | "CLOSED";
  lastMessageAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Messages {
  id: string;
  conversationId: string;
  senderId: string;
  senderRole: "user" | "god";
  content: string;
  attachmentUrl: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface TicketResponse {
  ticket: string;
}

export interface WsTicketRequest {
  ticket: string;
}
