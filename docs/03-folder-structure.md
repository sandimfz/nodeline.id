# 03. Folder Structure

## Root

```
nodeline.id/
├── api/                  # NestJS Backend API
├── client/               # Next.js 16 Client Frontend
├── admin/                # Vite + React Admin Panel
├── docs/                 # Dokumentasi project
├── scripts/              # Utility scripts (seed, dll.)
├── pnpm-workspace.yaml   # (planned) Monorepo workspace config
├── drizzle.config.ts     # Drizzle ORM configuration
└── .env                  # Environment variables (tidak di-commit)
```

---

## API Backend (`api/`)

```
api/
├── src/
│   ├── main.ts                      # Entry point — NestJS bootstrap
│   ├── app.module.ts                # Root module
│   ├── app.controller.ts            # Health check endpoint
│   ├── app.service.ts               # Health check service
│   │
│   ├── config/
│   │   ├── configuration.ts         # Env → typed config object
│   │   └── validation.schema.ts     # Zod schema for env validation
│   │
│   ├── common/
│   │   └── crypto/
│   │       └── stock-crypto.util.ts # AES-256-GCM encrypt/decrypt
│   │
│   ├── database/
│   │   └── drizzle/
│   │       ├── drizzle.module.ts    # Global Drizzle module
│   │       ├── drizzle.service.ts   # DB pool + transaction helper
│   │       ├── schema/
│   │       │   ├── index.ts         # Re-export all schemas
│   │       │   ├── users.schema.ts
│   │       │   ├── products.schema.ts
│   │       │   ├── categories.schema.ts
│   │       │   ├── orders.schema.ts
│   │       │   ├── order-items.schema.ts
│   │       │   ├── stock-units.schema.ts
│   │       │   ├── fulfillments.schema.ts
│   │       │   ├── refresh-tokens.schema.ts
│   │       │   ├── conversations.schema.ts
│   │       │   ├── messages.schema.ts
│   │       │   ├── audit-logs.schema.ts
│   │       │   └── payment-methods.schema.ts
│   │       └── migrations/          # Auto-generated SQL migrations
│   │
│   └── modules/
│       ├── auth/
│       │   ├── auth.module.ts
│       │   ├── auth.controller.ts   # Register, login, refresh, logout, me, users
│       │   ├── auth.service.ts      # Core auth logic + token management
│       │   ├── decorators/
│       │   │   ├── current-user.decorator.ts
│       │   │   └── roles.decorator.ts
│       │   ├── guards/
│       │   │   ├── jwt-auth.guard.ts      # Passport JWT guard
│       │   │   ├── jwt-refresh.guard.ts   # Refresh token extraction guard
│       │   │   ├── roles.guard.ts         # Role-based access control
│       │   │   └── roles.guard.spec.ts
│       │   ├── strategies/
│       │   │   └── jwt-access.strategy.ts # Passport strategy
│       │   ├── interfaces/
│       │   │   └── jwt-payload.interface.ts
│       │   └── dto/
│       │       ├── login.dto.ts
│       │       ├── register.dto.ts
│       │       └── refresh-token.dto.ts
│       │
│       ├── marketplace/
│       │   ├── marketplace.module.ts
│       │   ├── products/
│       │   │   ├── products.controller.ts       # Public catalog endpoints
│       │   │   ├── products-admin.controller.ts # Admin CRUD endpoints
│       │   │   ├── products.service.ts
│       │   │   ├── products.service.spec.ts
│       │   │   └── dto/ (create, update, restock)
│       │   ├── orders/
│       │   │   ├── orders.controller.ts
│       │   │   ├── orders.service.ts
│       │   │   └── dto/ (checkout)
│       │   ├── payments/
│       │   │   ├── payments.controller.ts
│       │   │   ├── payments.service.ts
│       │   │   ├── providers/
│       │   │   │   ├── payment-provider.interface.ts
│       │   │   │   └── manual-payment.provider.ts
│       │   │   └── dto/ (confirm-payment)
│       │   ├── stock/
│       │   │   ├── stock.controller.ts
│       │   │   ├── stock.service.ts
│       │   │   └── dto/ (manual-assign)
│       │   ├── storage/
│       │   │   ├── storage.controller.ts
│       │   │   ├── storage.service.ts
│       │   │   └── dto/ (request-upload, confirm-upload)
│       │   ├── categories/
│       │   │   ├── categories.controller.ts
│       │   │   ├── categories.service.ts
│       │   │   └── dto/ (create-category)
│       │   ├── payment-methods/
│       │   │   ├── payment-methods.controller.ts
│       │   │   ├── payment-methods.service.ts
│       │   │   └── dto/ (create, update)
│       │   └── audit-logs/
│       │       └── audit-logs.service.ts
│       │
│       └── chat/
│           ├── chat.module.ts
│           ├── chat.controller.ts    # REST endpoints (conversations, messages)
│           ├── chat.service.ts       # Business logic + socket/ticket registry
│           ├── chat.gateway.ts       # Socket.IO WebSocket gateway
│           └── dto/ (chat)
│
├── test/
│   ├── jest-e2e.json
│   └── app.e2e-spec.ts
│
├── nest-cli.json
├── tsconfig.json
└── package.json
```

---

## Client Frontend (`client/`)

```
client/
├── app/
│   ├── layout.tsx                    # Root layout (SSR prefetch user)
│   ├── page.tsx                      # Landing page (Header + Hero + Footer)
│   ├── providers.tsx                 # TanStack Query provider + hydration
│   ├── globals.css                   # Tailwind v4 global styles
│   │
│   ├── (app)/                        # Authenticated routes layout
│   │   ├── layout.tsx                # AppShell wrapper
│   │   ├── dashboard/
│   │   │   ├── page.tsx
│   │   │   ├── dashboard-content.tsx
│   │   │   ├── profile/
│   │   │   │   ├── page.tsx
│   │   │   │   └── profile-content.tsx
│   │   │   └── chat/
│   │   │       ├── page.tsx
│   │   │       └── chat-client.tsx
│   │   └── orders/
│   │       ├── page.tsx
│   │       └── [id]/page.tsx
│   │
│   ├── (auth)/                       # Auth pages layout
│   │   └── layout.tsx
│   │
│   ├── auth/
│   │   ├── login/page.tsx + login.tsx
│   │   └── register/page.tsx + register-content.tsx
│   │
│   ├── marketplace/
│   │   ├── layout.tsx
│   │   ├── page.tsx                  # Product catalog (SSR)
│   │   ├── [id]/
│   │   │   ├── page.tsx              # Product detail (SSR)
│   │   │   └── product-detail.tsx    # Client component
│   │
│   ├── checkout/
│   │   ├── page.tsx
│   │   └── checkout-form.tsx         # Checkout form (client component)
│   │
│   └── api/v1/bff/[...path]/route.ts # BFF proxy route handler
│
├── components/
│   ├── ui/                          # shadcn/ui components (60+)
│   ├── auth/
│   │   └── auth-init.tsx            # Hydrate auth state on mount
│   ├── dashboard/
│   │   ├── app-shell.tsx            # Dashboard layout shell
│   │   ├── app-header.tsx           # Dashboard header
│   │   ├── app-sidebar.tsx          # Sidebar navigation
│   │   ├── nav-group.tsx            # Navigation group
│   │   ├── nav-user.tsx             # User avatar + dropdown
│   │   ├── profile-ui.tsx           # Profile display component
│   │   ├── latest-change.tsx
│   │   ├── app-shared.tsx           # Shared nav config
│   │   └── logo.tsx
│   ├── layout/
│   │   ├── header.tsx               # Public header (sticky)
│   │   ├── footer.tsx               # Public footer
│   │   ├── hero.tsx                 # Landing hero section
│   │   ├── theme-provider.tsx       # next-themes provider
│   │   └── theme.tsx                # Theme switcher
│   ├── marketplace/
│   │   └── card-product.tsx         # Product card component
│   ├── chat/
│   │   ├── chat-input.tsx
│   │   ├── typing-indicator.tsx
│   │   └── chat-window.tsx
│   └── motion/
│       └── animated-toast-stack.tsx
│
├── features/
│   ├── auth/
│   │   ├── api.ts                   # Auth API calls
│   │   ├── hooks.ts                 # Auth hooks (useLogin, useRegister, etc.)
│   │   ├── types.ts
│   │   └── schema.ts                # Zod validation schemas
│   ├── marketplace/
│   │   ├── api.ts
│   │   ├── hooks.ts
│   │   └── types.ts
│   └── chat/
│       ├── api.ts
│       ├── hooks.ts                 # Chat hooks (useChatSocket, useSendMessage, etc.)
│       ├── types.ts
│       └── socket.ts                # Socket.IO client singleton
│
├── lib/
│   ├── api-client.ts                # BFF fetch client with auto-refresh
│   ├── bff-server.ts                # Server-side fetch helper
│   ├── get-query-client.ts          # SSR QueryClient factory
│   ├── query-keys.ts                # Centralized query keys
│   ├── toast.tsx                    # Toast notifications
│   └── utils.ts                     # shadcn/ui utility (cn)
│
├── stores/
│   └── auth-store.ts                # Zustand auth store (in-memory token)
│
├── hooks/
│   └── use-mobile.ts                # Mobile detection hook
│
├── proxy.ts                         # Route protection (middleware)
├── next.config.ts
└── package.json
```

---

## Admin Panel (`admin/`)

```
admin/
├── src/
│   ├── main.tsx                     # Entry point
│   ├── App.tsx                      # Router + providers setup
│   ├── index.css                    # Tailwind v4
│   │
│   ├── components/
│   │   ├── ui/                      # shadcn/ui components (60+)
│   │   ├── theme-provider.tsx
│   │   ├── auth/
│   │   │   ├── ProtectedRoute.tsx   # Route guard (auth check)
│   │   │   └── auth-init.tsx        # Hydrate auth state
│   │   └── layout/
│   │       ├── app-shell.tsx        # Admin layout shell
│   │       ├── app-header.tsx       # Admin header
│   │       ├── app-sidebar.tsx      # Admin sidebar navigation
│   │       └── theme.tsx            # Theme switcher
│   │
│   ├── pages/
│   │   ├── LoginPage.tsx            # Admin login (secret path)
│   │   ├── DashboardPage.tsx        # Stats overview
│   │   ├── ProductsPage.tsx         # Product list + CRUD
│   │   ├── ProductDetailPage.tsx    # Product detail + restock + stock view
│   │   ├── OrdersPage.tsx           # Order list
│   │   ├── AllOrdersPage.tsx        # All orders with filters
│   │   ├── OrderDetailPage.tsx      # Order detail + fulfill
│   │   ├── UsersPage.tsx            # User management
│   │   ├── CategoriesPage.tsx       # Category management
│   │   ├── PaymentMethodsPage.tsx   # Payment methods management
│   │   ├── ChatConversationsPage.tsx # Chat conversations list
│   │   ├── ChatConversationDetailPage.tsx # Chat detail
│   │   ├── SettingsPage.tsx         # Admin settings
│   │   └── ForbiddenPage.tsx        # 403 error page
│   │
│   ├── features/
│   │   ├── auth/
│   │   │   ├── api.ts
│   │   │   ├── hooks.ts
│   │   │   ├── schema.ts
│   │   │   └── types.ts
│   │   ├── marketplace/
│   │   │   ├── api.ts
│   │   │   ├── hooks.ts
│   │   │   ├── schema.ts
│   │   │   ├── types.ts
│   │   │   └── components/
│   │   │       └── ProductForm.tsx
│   │   └── chat/
│   │       ├── api.ts
│   │       ├── hooks.ts
│   │       └── types.ts
│   │
│   ├── lib/
│   │   ├── api-client.ts            # Axios client with auto-refresh
│   │   ├── config.ts                # Admin path config
│   │   ├── query-keys.ts            # Centralized query keys
│   │   ├── toast.ts
│   │   └── utils.ts
│   │
│   ├── stores/
│   │   └── auth-store.ts            # Zustand + localStorage persist
│   │
│   └── hooks/
│       └── use-mobile.ts
│
├── vite.config.ts                    # Vite config + proxy + security middleware
├── tsconfig.json, tsconfig.app.json, tsconfig.node.json
└── package.json
```
