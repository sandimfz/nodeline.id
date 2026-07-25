import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Settings,
  Tags,
  MessageCircle,
  Banknote,
  Cloud,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ADMIN_BASE } from "@/lib/config";

const navItems = [
  { to: `${ADMIN_BASE}/dashboard`, label: "Dashboard", icon: LayoutDashboard },
  { to: `${ADMIN_BASE}/dashboard/chat`, label: "Percakapan", icon: MessageCircle },
  { to: `${ADMIN_BASE}/dashboard/products`, label: "Produk", icon: Package },
  { to: `${ADMIN_BASE}/dashboard/orders`, label: "Pesanan", icon: ShoppingCart },
  { to: `${ADMIN_BASE}/dashboard/categories`, label: "Kategori", icon: Tags },
  { to: `${ADMIN_BASE}/dashboard/api-services`, label: "API Services", icon: Cloud },
  { to: `${ADMIN_BASE}/dashboard/users`, label: "Pengguna", icon: Users },
  { to: `${ADMIN_BASE}/dashboard/payment-methods`, label: "Pembayaran", icon: Banknote },
  { to: `${ADMIN_BASE}/dashboard/settings`, label: "Pengaturan", icon: Settings },
];

export function AppSidebar() {
  const { pathname } = useLocation();

  const isActive = (path: string) => {
    if (path === `${ADMIN_BASE}/dashboard`) return pathname === `${ADMIN_BASE}/dashboard`;
    return pathname.startsWith(path);
  };

  return (
    <aside className="flex h-full w-56 flex-col border-r border-border bg-sidebar">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2 border-b border-border px-4">
        <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-bold">
          N
        </div>
        <span className="font-semibold text-sm">Nodeline Admin</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive(item.to)
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-border p-3">
        <p className="text-center text-[10px] text-muted-foreground">
          Nodeline v1.0
        </p>
      </div>
    </aside>
  );
}
