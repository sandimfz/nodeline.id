import { useState } from "react";
import { Plus, Trash2, Tag, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { useToast } from "@/lib/toast";
import { useCategories, useCreateCategory, useDeleteCategory } from "@/features/marketplace/hooks";

export function CategoriesPage() {
  const { data: categories, isLoading } = useCategories();
  const createCategory = useCreateCategory();
  const deleteCategory = useDeleteCategory();
  const toast = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");

  const handleCreate = () => {
    if (!newName.trim()) return;
    createCategory.mutate(
      { name: newName.trim() },
      {
        onSuccess: () => {
          setCreateOpen(false);
          setNewName("");
          toast.success("Kategori berhasil ditambahkan");
        },
        onError: (err: unknown) => {
          const msg =
            typeof (err as Record<string, unknown>)?.message === "string"
              ? ((err as Record<string, unknown>).message as string)
              : "Gagal menambah kategori";
          toast.error(msg);
        },
      },
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Kategori</h1>
          <p className="text-sm text-muted-foreground">
            Kelola kategori produk marketplace
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger
            render={<Button />}
          >
            <Plus data-icon="inline-start" />
            Tambah Kategori
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Tambah Kategori Baru</DialogTitle>
            </DialogHeader>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="cat-name">Nama Kategori</FieldLabel>
                <Input
                  id="cat-name"
                  placeholder="Contoh: API Key, Template, Ebook"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreate();
                  }}
                />
              </Field>
              <Button
                onClick={handleCreate}
                disabled={createCategory.isPending || !newName.trim()}
              >
                {createCategory.isPending ? "Menyimpan..." : "Simpan"}
              </Button>
            </FieldGroup>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Kategori</CardTitle>
            <Tag className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">
              {isLoading ? "..." : categories?.length ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Produk Terkategori
            </CardTitle>
            <Hash className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">—</p>
          </CardContent>
        </Card>
      </div>

      {/* Categories list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daftar Kategori</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : !categories || categories.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Belum ada kategori. Klik "Tambah Kategori" untuk memulai.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Nama
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Slug
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Dibuat
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((cat) => (
                    <tr
                      key={cat.id}
                      className="border-b border-border transition-colors hover:bg-muted/50"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Tag className="size-3.5 text-muted-foreground" />
                          <span className="font-medium">{cat.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-[10px]">
                          {cat.slug}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {new Date(cat.createdAt).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-destructive hover:text-destructive"
                          onClick={() => {
                            deleteCategory.mutate(cat.id, {
                              onSuccess: () => {
                                toast.success(`Kategori "${cat.name}" dihapus`);
                              },
                              onError: (err: unknown) => {
                                const msg =
                                  typeof (err as Record<string, unknown>)?.message === "string"
                                    ? ((err as Record<string, unknown>).message as string)
                                    : "Gagal menghapus kategori";
                                toast.error(msg);
                              },
                            });
                          }}
                          disabled={deleteCategory.isPending}
                        >
                          <Trash2 />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
