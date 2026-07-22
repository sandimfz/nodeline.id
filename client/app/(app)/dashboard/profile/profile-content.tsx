"use client";

import { useState, useRef } from "react";
import {
  AtSignIcon,
  KeyRoundIcon,
  ShieldCheckIcon,
  TrashIcon,
  UploadIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useMe, useUpdateProfile } from "@/features/auth/hooks";
import { useToast } from "@/lib/toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Section,
  Field,
  SecurityRow,
} from "@/components/dashboard/profile-ui";

export default function ProfilePage() {
  const { data: user } = useMe();
  const { mutate: updateProfile, isPending } = useUpdateProfile();
  const toast = useToast();

  const nameRef = useRef<HTMLInputElement>(null);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initials = user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const joinedDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString("id-ID", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "-";

  const updatedDate = user?.updatedAt
    ? new Date(user.updatedAt).toLocaleDateString("id-ID", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "-";

  const handleSave = () => {
    setError(null);

    // Baca value dari ref (hindari masalah controlled input vs Base UI)
    const currentName = nameRef.current?.value ?? "";

    if (!currentName.trim()) {
      setError("Nama tidak boleh kosong");
      return;
    }
    if (currentName.trim().length < 2) {
      setError("Nama minimal 2 karakter");
      return;
    }
    if (currentName.trim().length > 50) {
      setError("Nama maksimal 50 karakter");
      return;
    }

    updateProfile(
      { name: currentName.trim() },
      {
        onSuccess: () => {
          toast.success("Profil berhasil diperbarui");
        },
        onError: (err: unknown) => {
          const apiError = err as { message?: string | string[] };
          const msg = Array.isArray(apiError?.message)
            ? apiError.message.join(". ")
            : apiError?.message ?? "Gagal memperbarui profil";
          setError(msg);
          toast.error(msg);
        },
      },
    );
  };

  return (
    <ScrollArea
      key={user?.id ?? "guest"}
      className="flex-1 bg-background text-foreground"
    >
      <div className="space-y-8 px-4 pt-4 pb-8 md:px-6 md:pt-6 md:pb-12">
        <div>
          <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.3em]">
            Akun · Profil
          </div>
          <h1 className="mt-1 font-heading text-3xl">Profil</h1>
          <p className="mt-1.5 text-muted-foreground text-sm">
            Atur informasi profil dan akun kamu.
          </p>
        </div>

        {/* Foto */}
        <Section title="Foto">
          <div className="flex items-center gap-5">
            <Avatar className="size-20 shrink-0 border ring-1 ring-border/60">
              <AvatarFallback className="text-lg bg-gradient-to-br from-primary/40 to-primary/10">
                {initials ?? "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-1 flex-col gap-2">
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" type="button">
                  <UploadIcon />
                  Unggah
                </Button>
                <Button size="sm" variant="ghost" type="button">
                  Hapus
                </Button>
              </div>
              <p className="text-muted-foreground text-xs">
                Ukuran yang disarankan: 400×400 PNG, JPG, atau SVG.
              </p>
            </div>
          </div>
        </Section>

        <Separator />

        {/* Identitas */}
        <Section title="Identitas">
          <Field label="Nama tampilan" htmlFor="p-name" hint="Minimal 2 karakter">
            <Input
              id="p-name"
              ref={nameRef}
              key={`name-${user?.id}`}
              defaultValue={user?.name ?? ""}
              onChange={() => {
                setDirty(true);
                setError(null);
              }}
              placeholder="Nama kamu"
            />
          </Field>
          <Field label="Email" htmlFor="p-email">
            <div className="flex h-9 items-center gap-1 rounded-lg border border-input bg-background px-3 font-mono text-sm focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/24">
              <AtSignIcon className="size-3.5 opacity-60" />
              <input
                id="p-email"
                defaultValue={user?.email ?? ""}
                readOnly
                className="flex-1 bg-transparent outline-none"
              />
            </div>
          </Field>
        </Section>

        <Separator />

        {/* Akun */}
        <Section title="Akun">
          <Field label="Bergabung" htmlFor="p-joined">
            <Input id="p-joined" defaultValue={joinedDate} readOnly />
          </Field>
          <Field label="Terakhir diperbarui" htmlFor="p-updated">
            <Input id="p-updated" defaultValue={updatedDate} readOnly />
          </Field>
          <Field label="Verifikasi email">
            <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-background/40 px-3.5 py-2 text-sm">
              <div
                className={`size-2 rounded-full ${
                  user?.isEmailVerified
                    ? "bg-emerald-500"
                    : "bg-amber-500"
                }`}
              />
              <span>
                {user?.isEmailVerified ? "Terverifikasi" : "Belum verifikasi"}
              </span>
            </div>
          </Field>

          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}

          <Button
            size="sm"
            type="button"
            disabled={!dirty || isPending}
            onClick={handleSave}
            className="self-start"
          >
            {isPending ? "Menyimpan..." : "Simpan perubahan"}
          </Button>
        </Section>

        <Separator />

        {/* Keamanan */}
        <Section title="Keamanan">
          <SecurityRow
            icon={<ShieldCheckIcon className="size-4" />}
            title="Autentikasi dua faktor"
            description="Aplikasi autentikasi · aktif"
            cta="Kelola"
          />
          <SecurityRow
            icon={<KeyRoundIcon className="size-4" />}
            title="Sesi aktif"
            description="3 perangkat · terakhir aktif 2 menit lalu"
            cta="Tinjau"
          />
          <SecurityRow
            destructive
            icon={<TrashIcon className="size-4" />}
            title="Hapus akun"
            description="Hapus akun dan data pribadi kamu secara permanen."
            cta="Hapus"
          />
        </Section>
      </div>
    </ScrollArea>
  );
}
