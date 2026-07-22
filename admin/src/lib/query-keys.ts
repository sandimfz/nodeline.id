export const queryKeys = {
  auth: {
    all: ["auth"] as const,
    me: ["auth", "me"] as const,
    users: ["auth", "users"] as const,
  },
  products: {
    all: ["products"] as const,
    detail: (id: string) => ["products", id] as const,
  },
  orders: {
    all: ["orders"] as const,
    allList: ["orders", "all"] as const,
    detail: (id: string) => ["orders", id] as const,
    adminDetail: (id: string) => ["orders", "admin", id] as const,
    pendingByProduct: (productId: string) =>
      ["orders", "pending", productId] as const,
  },
  stockUnits: {
    byProduct: (productId: string) =>
      ["stock-units", productId] as const,
  },
  categories: {
    all: ["categories"] as const,
  },
  chat: {
    all: ["chat"] as const,
    conversations: {
      all: ["chat", "conversations"] as const,
      list: ["chat", "conversations", "list"] as const,
    },
    messages: (conversationId: string) =>
      ["chat", "messages", conversationId] as const,
  },
} as const;
