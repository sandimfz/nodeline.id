# 07. Frontend Components

## Client Frontend (Next.js 16)

Komponen-komponen utama di aplikasi client:

### Layout Components

#### Header (`components/layout/header.tsx`)
Header sticky dengan backdrop blur. Berisi:
- Logo
- Navigation menu (Kategori, Marketplace, Harga, Tentang)
- Cart icon
- User dropdown (avatar, profile, orders, theme, logout)
- Login/Register button (jika belum login)

**State:** Membaca `useAuthStore` untuk user dan hydration status.

#### Footer (`components/layout/footer.tsx`)
Footer publik dengan informasi kontak, link, dan copyright.

#### Hero (`components/layout/hero.tsx`)
Hero section landing page.

#### ThemeProvider (`components/layout/theme-provider.tsx`)
Wrapper `next-themes` dengan atribut `class`, default `system`.

#### ThemeSwitcher (`components/layout/theme.tsx`)
Toggle untuk mengganti theme.

---

### Dashboard Components

#### AppShell (`components/dashboard/app-shell.tsx`)
Layout untuk halaman yang membutuhkan autentikasi. Menggunakan `SidebarProvider`.

```
SidebarProvider
├── AppSidebar (collapsible sidebar)
└── SidebarInset
    ├── AppHeader (dashboard header)
    └── children (page content)
```

#### AppSidebar (`components/dashboard/app-sidebar.tsx`)
Sidebar navigasi dengan:
- Logo + "Efferd"
- Quick create button + search
- Nav groups (definisi di `app-shared.tsx`)
- Chat menu dengan unread badge (dari `useUnreadCount()`)
- Footer nav links
- Latest change info

#### AppHeader (`components/dashboard/app-header.tsx`)
Header dashboard dengan breadcrumbs dan user menu.

#### NavGroup (`components/dashboard/nav-group.tsx`)
Group navigasi collapsible di sidebar.

#### NavUser (`components/dashboard/nav-user.tsx`)
User avatar dropdown di sidebar.

#### Logo (`components/dashboard/logo.tsx`)
Logo icon component.

---

### Auth Components

#### AuthInit (`components/auth/auth-init.tsx`)
Client component untuk hydrate auth state dari server-side prefetch saat mount.

**Fungsi:**
- Monitor `useMe()` query result
- Sync ke zustand store
- Set `_hydrated` flag

---

### Marketplace Components

#### CardProduct (`components/marketplace/card-product.tsx`)
Product card untuk halaman katalog.

---

### Chat Components

#### ChatInput (`components/chat/chat-input.tsx`)
Input field untuk chat dengan:
- Text area dengan auto-resize
- Send button
- Typing indicator trigger (`onInput` → `startTyping`)

#### TypingIndicator (`components/chat/typing-indicator.tsx`)
Menampilkan animasi "sedang mengetik..." ketika user/admin sedang mengetik.

#### ChatWindow (`components/chat/chat-window.tsx`)
Window chat utama dengan:
- Message list (infinite scroll ke atas)
- Message bubbles
- Timestamp
- Read status

---

### Shared UI Components (`components/ui/`)

Project menggunakan **shadcn/ui** dengan 60+ komponen UI yang siap pakai:

| Component | File | Props Utama |
|-----------|------|-------------|
| Button | `button.tsx` | `variant` (default, destructive, outline, secondary, ghost, link), `size` (default, sm, lg, icon) |
| Card | `card.tsx` | `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter` |
| Dialog | `dialog.tsx` | `open`, `onOpenChange` |
| Sheet | `sheet.tsx` | Side panel component |
| Sidebar | `sidebar.tsx` | Collapsible sidebar dengan `SidebarProvider`, `SidebarInset` |
| Badge | `badge.tsx` | `variant` (default, secondary, destructive, outline) |
| Avatar | `avatar.tsx` | `Avatar`, `AvatarImage`, `AvatarFallback` |
| DropdownMenu | `dropdown-menu.tsx` | Dropdown with groups, separators, items |
| Accordion | `accordion.tsx` | Expandable sections |
| Skeleton | `skeleton.tsx` | Loading skeleton |
| Input | `input.tsx` | Text input |
| Textarea | `textarea.tsx` | Multiline text input |

Semua komponen mendukung `className` untuk kustomisasi Tailwind.

---

## Admin Panel (Vite + React)

### Layout Components

#### AppShell (`components/layout/app-shell.tsx`)
Layout admin dengan sidebar dan header.

#### AppSidebar (`components/layout/app-sidebar.tsx`)
Sidebar navigasi admin dengan item:
- Dashboard
- Produk
- Pesanan
- Kategori
- Pengguna
- Chat
- Pembayaran
- Pengaturan

#### AppHeader (`components/layout/app-header.tsx`)
Header admin dengan user info dan logout.

#### ThemeProvider (`components/theme-provider.tsx`)
Wrapper theme untuk admin panel.

#### ThemeSwitcher (`components/layout/theme.tsx`)
Toggle theme admin.

### Auth Components

#### ProtectedRoute (`components/auth/ProtectedRoute.tsx`)
Route guard yang mengecek `useAuthStore`:
- Jika belum login → redirect ke `ADMIN_BASE`
- Jika sudah login → render `Outlet` (child routes)
- Juga menyediakan `PublicRoute` (redirect dari login jika sudah login)

#### AuthInit (`components/auth/auth-init.tsx`)
Hydrate auth state saat mount.

### Feature Components

#### ProductForm (`features/marketplace/components/ProductForm.tsx`)
Form untuk create/edit produk dengan field: name, description, price, keysPerUnit, category, image.

### Pages

Semua halaman ada di `pages/`:
- `LoginPage.tsx` - Login form dengan Zod validation
- `DashboardPage.tsx` - Stats overview (products, orders, users, revenue, alerts)
- `ProductsPage.tsx` - Product list table with CRUD
- `ProductDetailPage.tsx` - Product detail + restock + stock units view
- `OrdersPage.tsx` - Single product pending orders
- `AllOrdersPage.tsx` - All orders list
- `OrderDetailPage.tsx` - Order detail + fulfillment management
- `UsersPage.tsx` - User management table
- `CategoriesPage.tsx` - Category management
- `PaymentMethodsPage.tsx` - Payment methods management
- `ChatConversationsPage.tsx` - Chat conversations list
- `ChatConversationDetailPage.tsx` - Chat detail with messages
- `SettingsPage.tsx` - Admin settings
- `ForbiddenPage.tsx` - 403 page
