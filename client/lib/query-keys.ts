export const queryKeys = {
  auth: {
    all: ["auth"] as const,
    me: ["auth", "me"] as const,
  },
  marketplace: {
    all: ["marketplace"] as const,
    products: {
      all: ["marketplace", "products"] as const,
      list: (filters?: Record<string, unknown>) =>
        ["marketplace", "products", "list", filters ?? {}] as const,
      detail: (id: string) => ["marketplace", "products", id] as const,
    },
    paymentMethods: {
      all: ["marketplace", "payment-methods"] as const,
    },
    orders: {
      all: ["marketplace", "orders"] as const,
      detail: (id: string) => ["marketplace", "orders", id] as const,
    },
  },
  apiKeys: {
    all: ["api-keys"] as const,
    list: ["api-keys", "list"] as const,
    usage: (id: string) => ["api-keys", "usage", id] as const,
  },
  apiDirectory: {
    all: ["api-directory"] as const,
    list: (params?: Record<string, unknown>) =>
      ["api-directory", "list", params ?? {}] as const,
    detail: (slug: string) => ["api-directory", slug] as const,
  },
  chat: {
    all: ["chat"] as const,
    conversations: {
      all: ["chat", "conversations"] as const,
      me: ["chat", "conversations", "me"] as const,
      myActive: ["chat", "conversations", "my-active"] as const,
      adminList: ["chat", "conversations", "admin"] as const,
    },
    messages: (conversationId: string) =>
      ["chat", "messages", conversationId] as const,
    unreadCount: ["chat", "unread-count"] as const,
  },
} as const;
