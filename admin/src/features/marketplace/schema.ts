import { z } from "zod";

export const createProductSchema = z.object({
  name: z
    .string()
    .min(1, "Nama produk wajib diisi")
    .max(200, "Nama produk maksimal 200 karakter"),
  description: z.string().max(2000, "Deskripsi maksimal 2000 karakter").optional(),
  priceCents: z
    .number()
    .int("Harga harus bilangan bulat")
    .min(0, "Harga minimal 0"),
  keysPerUnit: z
    .number()
    .int()
    .min(1, "Minimal 1 key per unit"),
  isActive: z.boolean().optional(),
  warrantyPeriodDays: z
    .number()
    .int()
    .min(0, "Masa garansi minimal 0 hari")
    .optional(),
  maxWarrantyClaims: z
    .number()
    .int()
    .min(0, "Maksimal klaim minimal 0")
    .optional(),
  imageUrl: z.string().max(500).optional(),
});

export type CreateProductSchema = z.infer<typeof createProductSchema>;

export const updateProductSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  priceCents: z.number().int().min(0).optional(),
  keysPerUnit: z.number().int().min(1).optional(),
  isActive: z.boolean().optional(),
  warrantyPeriodDays: z.number().int().min(0).nullable().optional(),
  maxWarrantyClaims: z.number().int().min(0).nullable().optional(),
  imageUrl: z.string().max(500).nullable().optional(),
});

export type UpdateProductSchema = z.infer<typeof updateProductSchema>;
