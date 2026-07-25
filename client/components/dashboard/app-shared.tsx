import type { ReactNode } from "react";
import {
  IconLayoutGrid,
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
        title: "API",
        path: "/api-directory",
        icon: <IconActivity />,
      },
      {
        title: "Pesanan",
        path: "/orders",
        icon: <IconFileDescription />,
      },
    ],
  },
  {
    label: "Layanan",
    items: [
      {
        title: "Chat",
        path: "/dashboard/chat",
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
