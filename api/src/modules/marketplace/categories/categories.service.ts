import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DrizzleService } from '../../../database/drizzle/drizzle.service.js';
import { categories } from '../../../database/drizzle/schema/index.js';
import type { Category } from '../../../database/drizzle/schema/categories.schema.js';

@Injectable()
export class CategoriesService {
  constructor(private readonly drizzle: DrizzleService) {}

  async create(name: string): Promise<Category> {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    // Check slug uniqueness
    const existing = await this.drizzle.db
      .select()
      .from(categories)
      .where(eq(categories.slug, slug))
      .limit(1);
    if (existing.length > 0) {
      throw new ConflictException('Kategori dengan nama tersebut sudah ada');
    }

    const [created] = await this.drizzle.db
      .insert(categories)
      .values({ name, slug })
      .returning();
    return created;
  }

  async findAll(): Promise<Category[]> {
    return this.drizzle.db.select().from(categories).orderBy(categories.name);
  }

  async remove(id: string): Promise<void> {
    const [existing] = await this.drizzle.db
      .select()
      .from(categories)
      .where(eq(categories.id, id))
      .limit(1);
    if (!existing) throw new NotFoundException('Kategori tidak ditemukan');

    await this.drizzle.db.delete(categories).where(eq(categories.id, id));
  }
}
