"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardPanel,
  CardFooter,
} from "@/components/ui/card";
import { Empty, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { IconApi, IconArrowRight } from "@tabler/icons-react";
import type { ApiService, ApiServiceListResult } from "@/features/api-directory/types";

const pricingBadgeVariant = {
  FREE: "secondary" as const,
  FREEMIUM: "default" as const,
  PAID: "outline" as const,
};

const pricingLabel = {
  FREE: "Gratis",
  FREEMIUM: "Freemium",
  PAID: "Berbayar",
};

const categoryEmoji: Record<string, string> = {
  trading: "📈",
  entertainment: "🎬",
  utility: "🔧",
  finance: "💰",
  social: "👥",
  ai: "🤖",
};

export function ApiDirectoryPage({
  initialData,
}: {
  initialData: ApiServiceListResult;
}) {
  const { services } = initialData;

  return (
    <div className="min-h-svh bg-background px-6 py-12">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex size-10 items-center justify-center rounded-xl border border-border bg-muted">
              <IconApi />
            </div>
            <h1 className="font-heading text-2xl">API Directory</h1>
          </div>
          <p className="text-muted-foreground">
            Temukan dan gunakan API untuk project kamu. Mulai gratis, upgrade kapan saja.
          </p>
        </header>

        {services.length === 0 ? (
          <Empty>
            <EmptyMedia>
              <IconApi />
            </EmptyMedia>
            <EmptyTitle>Belum ada API tersedia</EmptyTitle>
            <EmptyDescription>Silakan kembali lagi nanti</EmptyDescription>
          </Empty>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ServiceCard({ service }: { service: ApiService }) {
  const emoji = categoryEmoji[service.category] ?? "🔗";

  return (
    <Link href={`/api-directory/${service.slug}`} className="group block">
      <Card className="h-full overflow-hidden transition-shadow hover:shadow-lg">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg border bg-muted text-xl">
                {emoji}
              </div>
              <div>
                <CardTitle className="font-heading text-base">
                  {service.name}
                </CardTitle>
                <span className="text-xs text-muted-foreground">{service.version}</span>
              </div>
            </div>
            <Badge variant={pricingBadgeVariant[service.pricingType]}>
              {pricingLabel[service.pricingType]}
            </Badge>
          </div>
        </CardHeader>

        <CardPanel className="pt-0">
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {service.shortDescription ?? service.description ?? "No description"}
          </p>
          <Badge variant="secondary" className="mt-3 text-[10px] uppercase tracking-wider">
            {service.category}
          </Badge>
        </CardPanel>

        <CardFooter className="border-t">
          <Button variant="ghost" className="w-full group-hover:text-primary" size="sm">
            Lihat Detail
            <IconArrowRight data-icon="inline-end" />
          </Button>
        </CardFooter>
      </Card>
    </Link>
  );
}
