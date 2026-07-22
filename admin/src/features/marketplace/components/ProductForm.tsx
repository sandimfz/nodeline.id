import { type FormEvent, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Upload, X, RefreshCw } from "lucide-react";
import { createProductSchema } from "../schema";
import type { CreateProductInput } from "../types";
import { useCategories } from "../hooks";

interface ProductFormProps {
  initialData?: Partial<CreateProductInput>;
  onSubmit: (data: CreateProductInput) => void;
  isPending?: boolean;
  /** Product ID untuk upload gambar (hanya di edit mode) */
  productId?: string;
  uploadMutation?: {
    mutate: (file: File) => void;
    isPending: boolean;
    data?: { url: string } | null;
    reset: () => void;
  };
}

export function ProductForm({
  initialData,
  onSubmit,
  isPending,
  productId,
  uploadMutation,
}: ProductFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(initialData?.name ?? "");
  const [description, setDescription] = useState(
    initialData?.description ?? "",
  );
  const [priceCents, setPriceCents] = useState(
    initialData?.priceCents?.toString() ?? "",
  );
  const [keysPerUnit, setKeysPerUnit] = useState(
    initialData?.keysPerUnit?.toString() ?? "1",
  );
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true);
  const [warrantyPeriodDays, setWarrantyPeriodDays] = useState(
    initialData?.warrantyPeriodDays?.toString() ?? "",
  );
  const [maxWarrantyClaims, setMaxWarrantyClaims] = useState(
    initialData?.maxWarrantyClaims?.toString() ?? "",
  );
  const [imageUrl, setImageUrl] = useState(
    initialData?.imageUrl ?? "",
  );
  const [categoryId, setCategoryId] = useState(
    initialData?.categoryId ?? "",
  );
  const { data: categories = [] } = useCategories();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});

    const result = createProductSchema.safeParse({
      name,
      description: description || undefined,
      priceCents: priceCents ? parseInt(priceCents, 10) : undefined,
      keysPerUnit: keysPerUnit ? parseInt(keysPerUnit, 10) : undefined,
      isActive,
      warrantyPeriodDays: warrantyPeriodDays
        ? parseInt(warrantyPeriodDays, 10)
        : undefined,
      maxWarrantyClaims: maxWarrantyClaims
        ? parseInt(maxWarrantyClaims, 10)
        : undefined,
      imageUrl: imageUrl || undefined,
      categoryId: categoryId || undefined,
    });

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as string;
        if (!fieldErrors[field]) fieldErrors[field] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    onSubmit(result.data as CreateProductInput);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="product-name">Nama Produk *</Label>
        <Input
          id="product-name"
          required
          placeholder="Contoh: OpenAI API Key Pro"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={errors.name ? "border-destructive" : ""}
        />
        {errors.name && (
          <p className="text-xs text-destructive">{errors.name}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="product-desc">Deskripsi</Label>
        <Textarea
          id="product-desc"
          placeholder="Deskripsi produk..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="product-price">Harga (sen) *</Label>
          <Input
            id="product-price"
            type="number"
            min={0}
            required
            placeholder="50000"
            value={priceCents}
            onChange={(e) => setPriceCents(e.target.value)}
            className={errors.priceCents ? "border-destructive" : ""}
          />
          {errors.priceCents && (
            <p className="text-xs text-destructive">{errors.priceCents}</p>
          )}
          <p className="text-[10px] text-muted-foreground">
            Rp {parseInt(priceCents || "0").toLocaleString("id-ID")}
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="product-keys">Key / Unit *</Label>
          <Input
            id="product-keys"
            type="number"
            min={1}
            required
            placeholder="1"
            value={keysPerUnit}
            onChange={(e) => setKeysPerUnit(e.target.value)}
            className={errors.keysPerUnit ? "border-destructive" : ""}
          />
          {errors.keysPerUnit && (
            <p className="text-xs text-destructive">{errors.keysPerUnit}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="product-warranty">Garansi (hari)</Label>
          <Input
            id="product-warranty"
            type="number"
            min={0}
            placeholder="30"
            value={warrantyPeriodDays}
            onChange={(e) => setWarrantyPeriodDays(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="product-claims">Maks Klaim Garansi</Label>
          <Input
            id="product-claims"
            type="number"
            min={0}
            placeholder="2"
            value={maxWarrantyClaims}
            onChange={(e) => setMaxWarrantyClaims(e.target.value)}
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Switch
          id="product-active"
          checked={isActive}
          onCheckedChange={setIsActive}
        />
        <Label htmlFor="product-active">Produk aktif</Label>
      </div>

      {/* Category */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="product-category">Kategori</Label>
        <select
          id="product-category"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="h-9 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring/50"
        >
          <option value="">Pilih kategori (opsional)</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      {/* Image URL */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="product-image">URL Gambar</Label>
        <div className="flex gap-2">
          <Input
            id="product-image"
            placeholder="https://..."
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            className="flex-1"
          />
          {imageUrl && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-9 shrink-0"
              onClick={() => setImageUrl("")}
            >
              <X className="size-4" />
            </Button>
          )}
        </div>
        {errors.imageUrl && (
          <p className="text-xs text-destructive">{errors.imageUrl}</p>
        )}
      </div>

      {/* Image Preview */}
      {imageUrl && (
        <div className="relative overflow-hidden rounded-lg border border-border">
          <img
            src={imageUrl}
            alt="Preview"
            className="max-h-48 w-full object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
            onLoad={(e) => {
              (e.target as HTMLImageElement).style.display = "block";
            }}
          />
        </div>
      )}

      {/* File Upload (edit mode only) */}
      {productId && (
        <div className="rounded-lg border border-dashed border-border p-4">
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            Upload gambar produk (JPEG/PNG/WebP, max 2 MB, 800×800–1080×1080 piksel, rasio 1:1 hingga 3:4)
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file && uploadMutation) {
                uploadMutation.mutate(file);
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploadMutation?.isPending}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploadMutation?.isPending ? (
              <>
                <RefreshCw className="mr-1.5 size-4 animate-spin" />
                Mengupload...
              </>
            ) : (
              <>
                <Upload className="mr-1.5 size-4" />
                Pilih File
              </>
            )}
          </Button>
          {uploadMutation?.data && (
            <p className="mt-1.5 text-xs text-emerald-600 dark:text-emerald-400">
               Gambar berhasil diupload!
            </p>
          )}
        </div>
      )}

      <Button type="submit" size="lg" className="mt-2" disabled={isPending}>
        {isPending ? "Menyimpan..." : "Simpan"}
      </Button>
    </form>
  );
}
