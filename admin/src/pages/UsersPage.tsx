import { useState, useMemo } from "react";
import { Search, Users, Shield, UserCheck, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useUsers } from "@/features/auth/hooks";

const ROLE_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  god: { label: "Admin", variant: "default" },
  user: { label: "User", variant: "secondary" },
};

const PAGE_SIZE = 20;

export function UsersPage() {
  const { data: users, isLoading } = useUsers();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    if (!search.trim()) return users;
    const q = search.toLowerCase();
    setPage(0);
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q),
    );
  }, [users, search]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const paginatedUsers = filteredUsers.slice(
    safePage * PAGE_SIZE,
    (safePage + 1) * PAGE_SIZE,
  );

  const stats = useMemo(() => {
    if (!users) return { total: 0, god: 0, user: 0, verified: 0 };
    return {
      total: users.length,
      god: users.filter((u) => u.role === "god").length,
      user: users.filter((u) => u.role === "user").length,
      verified: users.filter((u) => u.isEmailVerified).length,
    };
  }, [users]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Pengguna</h1>
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Pengguna</h1>
        <p className="text-sm text-muted-foreground">
          Daftar semua pengguna yang terdaftar di platform
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Users className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Admin</CardTitle>
            <Shield className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-primary">{stats.god}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">User Biasa</CardTitle>
            <UserCheck className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{stats.user}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Email Terverifikasi</CardTitle>
            <Calendar className="size-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-emerald-600 dark:text-emerald-400">
              {stats.verified}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-xs">
        <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Cari nama, email, atau role..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 w-full pl-8 text-xs"
        />
      </div>

      {/* Users Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Nama
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Email
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Role
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Email Terverifikasi
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Bergabung
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedUsers.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-12 text-center text-muted-foreground"
                  >
                    {search
                      ? "Tidak ada pengguna yang cocok dengan pencarian"
                      : "Belum ada pengguna"}
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((user) => {
                  const roleInfo = ROLE_MAP[user.role] ?? {
                    label: user.role,
                    variant: "outline" as const,
                  };
                  return (
                    <tr
                      key={user.id}
                      className="border-b border-border transition-colors hover:bg-muted/50"
                    >
                      <td className="px-4 py-3 font-medium">{user.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {user.email}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={roleInfo.variant}
                          className="text-[10px]"
                        >
                          {roleInfo.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {user.isEmailVerified ? (
                          <Badge
                            variant="default"
                            className="bg-emerald-600 text-[10px] hover:bg-emerald-600"
                          >
                            Terverifikasi
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Belum
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {new Date(user.createdAt).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <p className="text-xs text-muted-foreground">
              Menampilkan {safePage * PAGE_SIZE + 1}–
              {Math.min((safePage + 1) * PAGE_SIZE, filteredUsers.length)} dari{" "}
              {filteredUsers.length} pengguna
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                disabled={safePage === 0}
                onClick={() => setPage(safePage - 1)}
              >
                <ChevronLeft className="size-4" />
              </Button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const start = Math.max(
                  0,
                  Math.min(safePage - 2, totalPages - 5),
                );
                const pageNum = start + i;
                if (pageNum >= totalPages) return null;
                return (
                  <Button
                    key={pageNum}
                    variant={pageNum === safePage ? "default" : "ghost"}
                    size="sm"
                    className="h-8 min-w-8 px-2 text-xs"
                    onClick={() => setPage(pageNum)}
                  >
                    {pageNum + 1}
                  </Button>
                );
              })}
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                disabled={safePage >= totalPages - 1}
                onClick={() => setPage(safePage + 1)}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
