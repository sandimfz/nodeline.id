"use client";

import Link from "next/link";
import { IconShoppingCart, IconUser, IconLogout, IconPackage } from "@tabler/icons-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { ThemeSwitcher } from "./theme";
import { useAuthStore } from "@/stores/auth-store";
import { useLogout } from "@/features/auth/hooks";
import Image from "next/image";

const categories = [
  {
    title: "Template",
    description: "Template Next.js dan dashboard lengkap.",
    href: "/marketplace",
  },
];

export function Header() {
  const user = useAuthStore((s) => s.user);
  const _hydrated = useAuthStore((s) => s._hydrated);
  const logout = useLogout();

  const isLoggedIn = !!user;
  // Selama belum hydrated, jangan render tombol auth apapun
  const showAuth = _hydrated;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 lg:px-0">
        <div className="flex h-14 items-center gap-6">
          <Link href="/" className="flex items-center">
            <Image
              src="https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/ai2/default.svg"
              width={100}
              height={100}
              alt="Logo"
              className="h-8 w-auto"
            />
          </Link>

          {/* Navigation menu */}
          <NavigationMenu className="hidden md:flex">
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuTrigger>Kategori</NavigationMenuTrigger>
                <NavigationMenuContent>
                  <ul className="grid w-[400px] gap-1 p-2 md:grid-cols-2">
                    {categories.map((cat) => (
                      <li key={cat.title}>
                        <NavigationMenuLink
                          render={<Link href={cat.href} />}
                          className="flex flex-col gap-1 rounded-lg p-3 transition-colors hover:bg-muted"
                        >
                          <span className="text-sm font-medium">
                            {cat.title}
                          </span>
                          <span className="text-muted-foreground text-xs leading-relaxed">
                            {cat.description}
                          </span>
                        </NavigationMenuLink>
                      </li>
                    ))}
                    <li>
                      <NavigationMenuLink
                        render={<Link href="/marketplace" />}
                        className="flex flex-col gap-1 rounded-lg p-3 transition-colors hover:bg-muted"
                      >
                        <span className="text-sm font-medium">
                          Semua produk
                        </span>
                        <span className="text-muted-foreground text-xs leading-relaxed">
                          Jelajahi seluruh katalog marketplace.
                        </span>
                      </NavigationMenuLink>
                    </li>
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <NavigationMenuLink
                  render={<Link href="/marketplace" />}
                  className={navigationMenuTriggerStyle()}
                >
                  Marketplace
                </NavigationMenuLink>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <NavigationMenuLink
                  render={<Link href="/marketplace" />}
                  className={navigationMenuTriggerStyle()}
                >
                  Harga
                </NavigationMenuLink>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <NavigationMenuLink
                  render={<Link href="/marketplace" />}
                  className={navigationMenuTriggerStyle()}
                >
                  Tentang
                </NavigationMenuLink>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/marketplace/cart"
            className="relative inline-flex size-9 items-center justify-center rounded-lg transition-colors hover:bg-muted"
            aria-label="Keranjang"
          >
            <IconShoppingCart className="size-4" />
          </Link>

          {showAuth ? (
            !isLoggedIn ? (
              <>
                <Link href="/auth/login">
                  <Button variant="ghost" size="sm">
                    Masuk
                  </Button>
                </Link>
                <Link href="/auth/register">
                  <Button variant="default" size="sm">
                    Daftar
                  </Button>
                </Link>
              </>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg p-1 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40">
                  <Avatar className="size-8 border">
                    {user.avatarUrl ? (
                      <AvatarImage src={user.avatarUrl} alt={user.name} />
                    ) : null}
                    <AvatarFallback className="text-xs">
                      {user.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-70 rounded-xl p-3" align="end">
                  <div className="p-2">
                    <p className="font-semibold">{user.name}</p>
                    <p className="text-muted-foreground text-sm truncate">
                      {user.email}
                    </p>
                  </div>
                  <DropdownMenuSeparator className="-mx-3" />
                  <DropdownMenuGroup>
                    <DropdownMenuItem>
                    <Link href="/dashboard/profile" className="flex w-full items-center gap-2 py-3">
                      <IconUser className="size-4" />
                      Profil
                    </Link>
                  </DropdownMenuItem>
                    <DropdownMenuItem>
                    <Link href="/orders" className="flex w-full items-center gap-2 py-3">
                      <IconPackage className="size-4" />
                      Pesanan
                    </Link>
                  </DropdownMenuItem>
                    <DropdownMenuItem className="justify-between py-3">
                      Theme <ThemeSwitcher />
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator className="-mx-3" />
                  <DropdownMenuItem
                    className="flex items-center gap-2 py-3 text-destructive focus:text-destructive"
                    onClick={() => logout.mutate()}
                    disabled={logout.isPending}
                  >
                    <IconLogout className="size-4" />
                    {logout.isPending ? "Logging out..." : "Logout"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )
          ) : null}
        </div>
      </div>
    </header>
  );
}
