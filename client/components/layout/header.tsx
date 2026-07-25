"use client";

import Link from "next/link";
import { IconUser, IconLogout, IconPackage, IconLayoutGrid } from "@tabler/icons-react";
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
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { ThemeSwitcher } from "./theme";
import { useAuthStore } from "@/stores/auth-store";
import { useLogout } from "@/features/auth/hooks";
import Image from "next/image";

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
                <NavigationMenuLink
                  render={<Link href="/marketplace" />}
                  className={navigationMenuTriggerStyle()}
                >
                  Marketplace
                </NavigationMenuLink>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <NavigationMenuLink
                  render={<Link href="/api-directory" />}
                  className={navigationMenuTriggerStyle()}
                >
                  API
                </NavigationMenuLink>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
        </div>

        <div className="flex items-center gap-2">

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
                <DropdownMenuContent className="w-60" align="end">
                  <DropdownMenuGroup>
                    <div className="flex items-center gap-3 px-2 py-2.5">
                      <Avatar className="size-10 border">
                        {user.avatarUrl ? (
                          <AvatarImage src={user.avatarUrl} alt={user.name} />
                        ) : null}
                        <AvatarFallback>
                          {user.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()
                            .slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{user.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                    </div>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem render={<Link href="/dashboard" />}>
                      <IconLayoutGrid className="size-4" />
                      Dashboard
                    </DropdownMenuItem>
                    <DropdownMenuItem render={<Link href="/dashboard/profile" />}>
                      <IconUser className="size-4" />
                      Profil
                    </DropdownMenuItem>
                    <DropdownMenuItem render={<Link href="/orders" />}>
                      <IconPackage className="size-4" />
                      Pesanan
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem className="justify-between">
                      Theme
                      <ThemeSwitcher />
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem
                      variant="destructive"
                      className="cursor-pointer"
                      onClick={() => logout.mutate()}
                      disabled={logout.isPending}
                    >
                      <IconLogout className="size-4" />
                      {logout.isPending ? "Logging out..." : "Logout"}
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            )
          ) : null}
        </div>
      </div>
    </header>
  );
}
