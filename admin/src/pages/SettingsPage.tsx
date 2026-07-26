import { type FormEvent, useState } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { useUpdateProfile } from "@/features/auth/hooks";
import { extractApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Shield, Save, User } from "lucide-react";
import { useToast } from "@/lib/toast";

export function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const updateProfile = useUpdateProfile();
  const toast = useToast();
  const [name, setName] = useState(user?.name ?? "");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Nama wajib diisi");
      return;
    }

    updateProfile.mutate(
      { name: name.trim() },
      {
        onSuccess: () => {
          toast.success("Profil berhasil diperbarui");
        },
        onError: (err: unknown) => {
          toast.error(extractApiError(err));
        },
      },
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Pengaturan</h1>
        <p className="text-sm text-muted-foreground">
          Kelola profil akun admin Anda
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Profile Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="size-4" />
              Profil Admin
            </CardTitle>
            <CardDescription>
              Update nama yang ditampilkan di panel admin
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="settings-name">Nama</Label>
                <Input
                  id="settings-name"
                  required
                  placeholder="Nama Anda"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={error ? "border-destructive" : ""}
                />
                {error && (
                  <p className="text-xs text-destructive">{error}</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Email</Label>
                <Input
                  value={user?.email ?? ""}
                  disabled
                  className="text-muted-foreground"
                />
                <p className="text-[10px] text-muted-foreground">
                  Email tidak bisa diubah
                </p>
              </div>

              <Button
                type="submit"
                size="lg"
                className="mt-2"
                disabled={updateProfile.isPending}
              >
                {updateProfile.isPending ? (
                  <>
                    <Spinner data-icon="inline-start" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Save data-icon="inline-start" />
                    Simpan Perubahan
                  </>
                )}
              </Button>

            </form>
          </CardContent>
        </Card>

        {/* Account Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="size-4" />
              Informasi Akun
            </CardTitle>
            <CardDescription>
              Detail akun admin Anda
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Role</span>
              <Badge variant="default" className="text-[10px]">
                {user?.role === "god" ? "Admin" : user?.role}
              </Badge>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email</span>
              <span>{user?.email}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Bergabung</span>
              <span>
                {user?.createdAt
                  ? new Date(user.createdAt).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })
                  : "—"}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email Terverifikasi</span>
              <span>{user?.isEmailVerified ? "Ya" : "Belum"}</span>
            </div>
            <Separator />
            <div className="pt-2">
              <p className="text-xs text-muted-foreground">
                Fitur ganti password akan segera tersedia.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
