import { Cloud, RefreshCw, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { NativeSelect } from "@/components/ui/native-select";
import { useApiServices, useUpdateApiService } from "@/features/api-services/hooks";
import type { ApiService } from "@/features/api-services/api";

const pricingLabel: Record<ApiService["pricingType"], string> = {
  FREE: "Gratis",
  FREEMIUM: "Freemium",
  PAID: "Berbayar",
};

const statusVariant: Record<
  ApiService["status"],
  "default" | "secondary" | "destructive"
> = {
  ACTIVE: "default",
  MAINTENANCE: "secondary",
  DEPRECATED: "destructive",
};

export function ApiServicesPage() {
  const { data, isLoading, refetch, isRefetching } = useApiServices();
  const update = useUpdateApiService();
  const services = data?.services ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">API Services</h1>
          <p className="text-muted-foreground text-sm">
            Aktifkan atau nonaktifkan API yang tampil di API Directory.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void refetch()}
          disabled={isRefetching}
        >
          {isRefetching ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <RefreshCw data-icon="inline-start" />
          )}
          {isRefetching ? "Memuat..." : "Refresh"}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      ) : services.length === 0 ? (
        <Empty>
          <EmptyMedia>
            <Cloud />
          </EmptyMedia>
          <EmptyTitle>Belum ada API service</EmptyTitle>
          <EmptyDescription>
            Jalankan seed script untuk menambahkan Trading API.
          </EmptyDescription>
        </Empty>
      ) : (
        <div className="flex flex-col gap-4">
          {services.map((service) => (
            <ServiceCard key={service.id} service={service} onUpdate={update.mutate} />
          ))}
        </div>
      )}
    </div>
  );
}

function ServiceCard({
  service,
  onUpdate,
}: {
  service: ApiService;
  onUpdate: (args: { id: string; data: Partial<ApiService> }) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex flex-col gap-1">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-base">{service.name}</CardTitle>
              <Badge variant="secondary">{service.version}</Badge>
              <Badge variant={statusVariant[service.status]}>
                {service.status}
              </Badge>
              {!service.isPublished && <Badge variant="outline">Draft</Badge>}
            </div>
            <CardDescription>
              {service.shortDescription ?? "Tidak ada deskripsi"}
            </CardDescription>
            <p className="font-mono text-xs text-muted-foreground truncate">
              {service.baseUrl}
            </p>
          </div>

          <label className="flex shrink-0 items-center gap-2 text-sm cursor-pointer">
            <span className="text-muted-foreground">Publikasi</span>
            <Switch
              checked={service.isPublished}
              onCheckedChange={(checked) =>
                onUpdate({ id: service.id, data: { isPublished: checked } })
              }
            />
          </label>
        </div>
      </CardHeader>

      <Separator />

      <CardContent className="pt-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              Status
            </span>
            <NativeSelect
              value={service.status}
              onChange={(e) =>
                onUpdate({
                  id: service.id,
                  data: { status: e.target.value as ApiService["status"] },
                })
              }
            >
              <option value="ACTIVE">Active</option>
              <option value="MAINTENANCE">Maintenance</option>
              <option value="DEPRECATED">Deprecated</option>
            </NativeSelect>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              Pricing
            </span>
            <NativeSelect
              value={service.pricingType}
              onChange={(e) =>
                onUpdate({
                  id: service.id,
                  data: { pricingType: e.target.value as ApiService["pricingType"] },
                })
              }
            >
              {Object.entries(pricingLabel).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </NativeSelect>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              Kategori
            </span>
            <p className="text-sm capitalize">{service.category}</p>
          </div>
        </div>
      </CardContent>

      <CardFooter className="border-t pt-4">
        <Button
          variant="outline"
          size="sm"
          render={
            <a
              href={`https://app.sandimf.dev/api-directory/${service.slug}`}
              target="_blank"
              rel="noreferrer"
            />
          }
        >
          <ExternalLink data-icon="inline-start" />
          Lihat di Directory
        </Button>
      </CardFooter>
    </Card>
  );
}

export default ApiServicesPage;
