import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { eq, and, ilike, asc, sql } from 'drizzle-orm';
import { createHash, randomBytes } from 'node:crypto';
import { DrizzleService } from '../../database/drizzle/drizzle.service.js';
import {
  apiServices,
  apiEndpoints,
  apiPlans,
  apiSubscriptions,
  apiKeys,
} from '../../database/drizzle/schema/index.js';
import type {
  CreateServiceDto,
  UpdateServiceDto,
  CreateEndpointDto,
  CreatePlanDto,
  ListServicesQueryDto,
} from './dto/api-directory.dto.js';

@Injectable()
export class ApiDirectoryService {
  constructor(private readonly drizzle: DrizzleService) {}

  // ─── Public: List & Detail ─────────────────────────────────

  async listPublished(query: ListServicesQueryDto) {
    const { search, category, page = 1, limit = 20 } = query;

    const conditions = [
      eq(apiServices.isPublished, true),
      eq(apiServices.status, 'ACTIVE'),
    ];

    if (category) {
      conditions.push(eq(apiServices.category, category));
    }
    if (search) {
      conditions.push(ilike(apiServices.name, `%${search}%`));
    }

    const offset = (page - 1) * limit;

    // Single round-trip: window function carries the total count per row.
    const rows = await this.drizzle.db
      .select({
        service: apiServices,
        total: sql<number>`count(*) over()::int`,
      })
      .from(apiServices)
      .where(and(...conditions))
      .orderBy(asc(apiServices.sortOrder), asc(apiServices.name))
      .limit(limit)
      .offset(offset);

    const total = rows[0]?.total ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / limit));

    return {
      services: rows.map((r) => r.service),
      total,
      page,
      limit,
      totalPages,
    };
  }

  async findBySlug(slug: string) {
    const [service] = await this.drizzle.db
      .select()
      .from(apiServices)
      .where(and(eq(apiServices.slug, slug), eq(apiServices.isPublished, true)))
      .limit(1);

    if (!service) throw new NotFoundException('API service tidak ditemukan');
    return service;
  }

  async getEndpoints(serviceId: string) {
    return this.drizzle.db
      .select()
      .from(apiEndpoints)
      .where(eq(apiEndpoints.serviceId, serviceId))
      .orderBy(asc(apiEndpoints.sortOrder));
  }

  async getPlans(serviceId: string) {
    return this.drizzle.db
      .select()
      .from(apiPlans)
      .where(and(eq(apiPlans.serviceId, serviceId), eq(apiPlans.isActive, true)))
      .orderBy(asc(apiPlans.sortOrder));
  }

  // ─── Subscribe ─────────────────────────────────────────────

  async subscribe(userId: string, slug: string, planName?: string) {
    // 1. Find service
    const [service] = await this.drizzle.db
      .select()
      .from(apiServices)
      .where(and(eq(apiServices.slug, slug), eq(apiServices.isPublished, true)))
      .limit(1);

    if (!service) throw new NotFoundException('API service tidak ditemukan');
    if (service.status !== 'ACTIVE') {
      throw new BadRequestException('API service sedang tidak tersedia');
    }

    // 2. Find plan
    const planConditions = [eq(apiPlans.serviceId, service.id), eq(apiPlans.isActive, true)];
    if (planName) {
      planConditions.push(eq(apiPlans.name, planName));
    }

    const plans = await this.drizzle.db
      .select()
      .from(apiPlans)
      .where(and(...planConditions))
      .orderBy(asc(apiPlans.sortOrder))
      .limit(1);

    const plan = plans[0];
    if (!plan) throw new NotFoundException('Plan tidak ditemukan');

    // 3. Get or create API key for user
    let [userKey] = await this.drizzle.db
      .select()
      .from(apiKeys)
      .where(and(eq(apiKeys.userId, userId), eq(apiKeys.isActive, true)))
      .limit(1);

    let rawKey: string | null = null;

    if (!userKey) {
      // Generate new API key
      const keyRaw = `nl_${randomBytes(24).toString('base64url')}`;
      const hashedKey = createHash('sha256').update(keyRaw).digest('hex');
      const keyPrefix = keyRaw.slice(0, 10);

      [userKey] = await this.drizzle.db
        .insert(apiKeys)
        .values({
          userId,
          name: 'Default Key',
          keyPrefix,
          hashedKey,
        })
        .returning();

      rawKey = keyRaw; // One-time reveal
    }

    // 4. Check existing subscription
    const [existingSub] = await this.drizzle.db
      .select()
      .from(apiSubscriptions)
      .where(
        and(
          eq(apiSubscriptions.apiKeyId, userKey.id),
          eq(apiSubscriptions.serviceId, service.id),
          eq(apiSubscriptions.status, 'ACTIVE'),
        ),
      )
      .limit(1);

    if (existingSub) {
      throw new ConflictException('Sudah berlangganan API ini');
    }

    // 5. Create subscription
    const tomorrow = new Date();
    tomorrow.setUTCHours(0, 0, 0, 0);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

    const [subscription] = await this.drizzle.db
      .insert(apiSubscriptions)
      .values({
        apiKeyId: userKey.id,
        serviceId: service.id,
        planId: plan.id,
        quotaResetAt: tomorrow,
      })
      .returning();

    return {
      subscription,
      service: { id: service.id, name: service.name, slug: service.slug },
      plan: { id: plan.id, name: plan.name, requestsPerDay: plan.requestsPerDay, requestsPerMinute: plan.requestsPerMinute },
      apiKey: rawKey
        ? { key: rawKey, prefix: userKey.keyPrefix, note: 'Simpan key ini — tidak bisa ditampilkan lagi' }
        : { prefix: userKey.keyPrefix, note: 'Menggunakan API key yang sudah ada' },
    };
  }

  // ─── Admin CRUD ────────────────────────────────────────────

  /** List every service, including unpublished/inactive ones (admin view). */
  async listAll() {
    const services = await this.drizzle.db
      .select()
      .from(apiServices)
      .orderBy(asc(apiServices.sortOrder), asc(apiServices.name));

    return {
      services,
      total: services.length,
      page: 1,
      limit: services.length,
      totalPages: 1,
    };
  }

  async createService(dto: CreateServiceDto) {
    const [existing] = await this.drizzle.db
      .select({ id: apiServices.id })
      .from(apiServices)
      .where(eq(apiServices.slug, dto.slug))
      .limit(1);

    if (existing) throw new ConflictException('Slug sudah digunakan');

    const [service] = await this.drizzle.db
      .insert(apiServices)
      .values(dto)
      .returning();

    return service;
  }

  async updateService(id: string, dto: UpdateServiceDto) {
    const [service] = await this.drizzle.db
      .update(apiServices)
      .set({ ...dto, updatedAt: new Date() })
      .where(eq(apiServices.id, id))
      .returning();

    if (!service) throw new NotFoundException('Service tidak ditemukan');
    return service;
  }

  async deleteService(id: string) {
    const [deleted] = await this.drizzle.db
      .delete(apiServices)
      .where(eq(apiServices.id, id))
      .returning();

    if (!deleted) throw new NotFoundException('Service tidak ditemukan');
    return { message: 'Service dihapus' };
  }

  async createEndpoint(serviceId: string, dto: CreateEndpointDto) {
    // Verify service exists
    const [service] = await this.drizzle.db
      .select({ id: apiServices.id })
      .from(apiServices)
      .where(eq(apiServices.id, serviceId))
      .limit(1);

    if (!service) throw new NotFoundException('Service tidak ditemukan');

    const [endpoint] = await this.drizzle.db
      .insert(apiEndpoints)
      .values({ serviceId, ...dto })
      .returning();

    return endpoint;
  }

  async createPlan(serviceId: string, dto: CreatePlanDto) {
    const [service] = await this.drizzle.db
      .select({ id: apiServices.id })
      .from(apiServices)
      .where(eq(apiServices.id, serviceId))
      .limit(1);

    if (!service) throw new NotFoundException('Service tidak ditemukan');

    const [plan] = await this.drizzle.db
      .insert(apiPlans)
      .values({ serviceId, ...dto })
      .returning();

    return plan;
  }
}
