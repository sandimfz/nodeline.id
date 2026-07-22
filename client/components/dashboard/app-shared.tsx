import type { ReactNode } from "react";
import {
  IconLayoutGrid,
  IconShoppingCart,
  IconWallet,
  IconKey,
  IconUsers,
  IconSettings,
  IconHelpCircle,
  IconActivity,
  IconPackage,
  IconFileDescription,
  IconMessageCircle,
} from "@tabler/icons-react";

export type SidebarNavItem = {
  title: string;
  path?: string;
  icon?: ReactNode;
  isActive?: boolean;
  subItems?: SidebarNavItem[];
};

export type SidebarNavGroup = {
  label?: string;
  items: SidebarNavItem[];
};

export const navGroups: SidebarNavGroup[] = [
  {
    items: [
      {
        title: "Dashboard",
        path: "/dashboard",
        icon: <IconLayoutGrid />,
      },
    ],
  },
  {
    label: "Marketplace",
    items: [
      {
        title: "Produk",
        path: "/marketplace",
        icon: <IconPackage />,
      },
      {
        title: "Pesanan",
        path: "/orders",
        icon: <IconFileDescription />,
      },
      {
        title: "Keranjang",
        path: "/marketplace/cart",
        icon: <IconShoppingCart />,
      },
    ],
  },
  {
    label: "Layanan",
    items: [
      {
        title: "Chat",
        path: "/chat",
        icon: <IconMessageCircle />,
      },
    ],
  },
  {
    label: "Akun",
    items: [
      {
        title: "Profil",
        path: "/dashboard/profile",
        icon: <IconUsers />,
      },
      {
        title: "Wallet",
        path: "/wallet",
        icon: <IconWallet />,
      },
      {
        title: "API Keys",
        path: "/api-keys",
        icon: <IconKey />,
      },
    ],
  },
  {
    label: "Lainnya",
    items: [
      {
        title: "Pengaturan",
        path: "/settings",
        icon: <IconSettings />,
      },
    ],
  },
];

export const footerNavLinks: SidebarNavItem[] = [
  {
    title: "Bantuan",
    path: "/help",
    icon: <IconHelpCircle />,
  },
  {
    title: "Status",
    path: "/status",
    icon: <IconActivity />,
  },
];

export const navLinks: SidebarNavItem[] = [
  ...navGroups.flatMap((group) =>
    group.items.flatMap((item) =>
      item.subItems?.length ? [item, ...item.subItems] : [item],
    ),
  ),
  ...footerNavLinks,
];
