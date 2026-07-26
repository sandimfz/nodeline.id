import { useState, useRef, type FormEvent } from "react";
import { Plus, Pencil, Trash2, Upload, X, Eye, EyeOff, Banknote, QrCode } from "lucide-react";
import { useToast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { usePaymentMethods, useCreatePaymentMethod, useUpdatePaymentMethod, useDeletePaymentMethod, useUploadPaymentImage } from "@/features/marketplace/hooks";
import { extractApiError } from "@/lib/api-client";
import type { PaymentMethod } from "@/features/marketplace/types";

function PaymentMethodCard({
  method,
  onEdit,
  onDelete,
}: {
  method: PaymentMethod;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="group relative flex items-start gap-4 rounded-lg border border-border p-4 transition-colors hover:bg-muted/30">
      {/* Image */}
      <div className="shrink-0">
        <img
          src={method.imageUrl}
          alt={method.name}
          className="size-16 rounded-lg border border-border object-cover"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = "https://placehold.co/200x200?text=Error";
          }}
        />
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {method.type === "qris" ? (
            <QrCode className="size-4 text-primary" />
          ) : (
            <Banknote className="size-4 text-blue-500" />
          )}
          <p className="truncate font-medium">{method.name}</p>
          <Badge variant={method.type === "qris" ? "default" : "secondary"} className="text-[10px]">
            {method.type === "qris" ? "QRIS" : "Transfer Bank"}
          </Badge>
          {!method.isActive && (
            <Badge variant="outline" className="text-[10px]">
              Nonaktif
            </Badge>
          )}
        </div>
        {method.accountName && (
          <p className="mt-0.5 text-sm text-muted-foreground">
            {method.accountName}
            {method.accountNumber && (
              <span className="ml-1 font-mono text-xs">({method.accountNumber})</span>
            )}
          </p>
        )}
        {method.sortOrder > 0 && (
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            Urutan: {method.sortOrder}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-start gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <Button variant="ghost" size="icon" className="size-8" onClick={onEdit}>
          <Pencil className="size-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="size-8 text-destructive hover:text-destructive" onClick={onDelete}>
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

function PaymentMethodForm({
  initial,
  onSubmit,
  isPending,
  onCancel,
}: {
  initial?: PaymentMethod | null;
  onSubmit: (data: {
    type: "bank_transfer" | "qris";
    name: string;
    imageUrl: string;
    accountNumber?: string;
    accountName?: string;
    isActive: boolean;
    sortOrder: number;
  }) => void;
  isPending: boolean;
  onCancel: () => void;
}) {
  const [type, setType] = useState<"bank_transfer" | "qris">(initial?.type ?? "bank_transfer");
  const [name, setName] = useState(initial?.name ?? "");
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl ?? "");
  const [accountNumber, setAccountNumber] = useState(initial?.accountNumber ?? "");
  const [accountName, setAccountName] = useState(initial?.accountName ?? "");
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [sortOrder, setSortOrder] = useState(initial?.sortOrder?.toString() ?? "0");
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadImage = useUploadPaymentImage();

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    uploadImage.mutate(file, {
      onSuccess: (res) => {
        setImageUrl(res.url);
      },
      onError: (err: unknown) => {
        const msg = extractApiError(err);
        setError(msg);
      },
    });
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Nama wajib diisi");
      return;
    }
    if (!imageUrl.trim()) {
      setError("Gambar metode pembayaran wajib diupload");
      return;
    }

    onSubmit({
      type,
      name: name.trim(),
      imageUrl: imageUrl.trim(),
      accountNumber: accountNumber.trim() || undefined,
      accountName: accountName.trim() || undefined,
      isActive,
      sortOrder: parseInt(sortOrder) || 0,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Type */}
      <div className="flex flex-col gap-1.5">
        <Label>Tipe</Label>
        <Select
          value={type}
          onValueChange={(v) => setType(v as "bank_transfer" | "qris")}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="bank_transfer">Transfer Bank</SelectItem>
            <SelectItem value="qris">QRIS</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Name */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="pm-name">Nama</Label>
        <Input
          id="pm-name"
          required
          placeholder={type === "qris" ? "QRIS - Mandiri" : "BCA - John Doe"}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      {/* Image Upload */}
      <div className="flex flex-col gap-1.5">
        <Label>Gambar</Label>
        {imageUrl ? (
          <div className="flex items-center gap-3 rounded-lg border border-border p-2">
            <img
              src={imageUrl}
              alt="Preview"
              className="size-12 rounded border border-border object-cover"
            />
            <span className="flex-1 truncate text-xs text-muted-foreground">
              Gambar terupload
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => setImageUrl("")}
            >
              <X className="size-3" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleImageUpload}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploadImage.isPending}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploadImage.isPending ? (
                <>
                  <Spinner data-icon="inline-start" />
                  Mengupload...
                </>
              ) : (
                <>
                  <Upload data-icon="inline-start" />
                  Upload Gambar
                </>
              )}
                      </Button>
                    </div>
                  )}
                  <p className="text-[10px] text-muted-foreground">
                    Upload gambar QRIS atau logo bank (JPEG/PNG/WebP)
                  </p>
      </div>

      {/* Bank fields */}
      {type === "bank_transfer" && (
        <>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pm-account-name">Nama Rekening</Label>
            <Input
              id="pm-account-name"
              placeholder="John Doe"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pm-account-number">Nomor Rekening</Label>
            <Input
              id="pm-account-number"
              placeholder="1234567890"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
            />
          </div>
        </>
      )}

      {/* Sort Order */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="pm-sort">Urutan</Label>
        <Input
          id="pm-sort"
          type="number"
          min={0}
          placeholder="0"
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
        />
      </div>

      {/* Active */}
      <div className="flex items-center gap-2">
        <Switch
          id="pm-active"
          checked={isActive}
          onCheckedChange={setIsActive}
        />
        <Label htmlFor="pm-active" className="text-sm">
          Aktif
        </Label>
      </div>

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}

      <div className="flex items-center justify-end gap-2 pt-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Batal
        </Button>
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "Menyimpan..." : "Simpan"}
        </Button>
      </div>
    </form>
  );
}

export function PaymentMethodsPage() {
  const { data: methods, isLoading } = usePaymentMethods();
  const createPaymentMethod = useCreatePaymentMethod();
  const updatePaymentMethod = useUpdatePaymentMethod();
  const deletePaymentMethod = useDeletePaymentMethod();
  const toast = useToast();

  const [createOpen, setCreateOpen] = useState(false);
  const [editMethod, setEditMethod] = useState<PaymentMethod | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Metode Pembayaran</h1>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Metode Pembayaran
          </h1>
          <p className="text-sm text-muted-foreground">
            Kelola metode pembayaran yang akan ditampilkan saat checkout
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus data-icon="inline-start" />
            Tambah Metode
          </Button>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Tambah Metode Pembayaran</DialogTitle>
              <DialogDescription>
                Tambah metode pembayaran baru (QRIS atau Transfer Bank)
              </DialogDescription>
            </DialogHeader>
            <PaymentMethodForm
              onSubmit={(data) =>
                createPaymentMethod.mutate(data, {
                  onSuccess: () => {
                    setCreateOpen(false);
                    toast.success("Metode pembayaran berhasil ditambahkan");
                  },
                  onError: (err: unknown) => {
                    toast.error(extractApiError(err));
                  },
                })
              }
              isPending={createPaymentMethod.isPending}
              onCancel={() => setCreateOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Banknote className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{methods?.length ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Aktif</CardTitle>
            <Eye className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-primary">
              {methods?.filter((m) => m.isActive).length ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Nonaktif</CardTitle>
            <EyeOff className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">
              {methods?.filter((m) => !m.isActive).length ?? 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* List */}
      {methods?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <QrCode className="mb-3 size-10 text-muted-foreground/50" />
            <p className="text-lg font-medium">Belum ada metode pembayaran</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Tambah metode pembayaran QRIS atau Transfer Bank untuk ditampilkan saat checkout
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {methods?.map((method) => (
            <PaymentMethodCard
              key={method.id}
              method={method}
              onEdit={() => setEditMethod(method)}
              onDelete={() => setDeleteId(method.id)}
            />
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editMethod !== null} onOpenChange={(open) => { if (!open) setEditMethod(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Metode Pembayaran</DialogTitle>
            <DialogDescription>
              Ubah informasi metode pembayaran
            </DialogDescription>
          </DialogHeader>
          {editMethod && (
            <PaymentMethodForm
              initial={editMethod}
              onSubmit={(data) =>
                updatePaymentMethod.mutate(
                  { id: editMethod.id, ...data },
                  {
                    onSuccess: () => {
                      setEditMethod(null);
                      toast.success("Metode pembayaran berhasil diupdate");
                    },
                    onError: (err: unknown) => {
                      toast.error(extractApiError(err));
                    },
                  },
                )
              }
              isPending={updatePaymentMethod.isPending}
              onCancel={() => setEditMethod(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={deleteId !== null}
        onOpenChange={(open) => setDeleteId(open ? deleteId : null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus metode pembayaran?</AlertDialogTitle>
            <AlertDialogDescription>
              Metode pembayaran akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteId(null)}>
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteId) {
                  deletePaymentMethod.mutate(deleteId, {
                    onSuccess: () => {
                      toast.success("Metode pembayaran dihapus");
                      setDeleteId(null);
                    },
                    onError: (err: unknown) => {
                      toast.error(extractApiError(err));
                      setDeleteId(null);
                    },
                  });
                }
              }}
            >
              {deletePaymentMethod.isPending ? "Menghapus..." : "Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
