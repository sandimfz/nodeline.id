import { Cloud, RefreshCw, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
          <RefreshCw className="size-4" />
          {isRefetching ? "Memuat..." : "Refresh"}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      ) : services.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <Cloud className="size-12 text-muted-foreground/50" />
            <p className="font-medium">Belum ada API service</p>
            <p className="text-muted-foreground text-sm">
              Jalankan seed script untuk menambahkan Trading API.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {services.map((service) => (
            <Card key={service.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">{service.name}</CardTitle>
                      <Badge variant="secondary">{service.version}</Badge>
                      <Badge variant={statusVariant[service.status]}>
                        {service.status}
                      </Badge>
                      {!service.isPublished && (
                        <Badge variant="outline">Draft</Badge>
                      )}
                    </div>
                    <CardDescription className="mt-1">
                      {service.shortDescription ?? "Tidak ada deskripsi"}
                    </CardDescription>
                    <p className="mt-2 font-mono text-xs text-muted-foreground truncate">
                      {service.baseUrl}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <label className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Publikasi</span>
                      <Switch
                        checked={service.isPublished}
                        onCheckedChange={(checked) =>
                          update.mutate({
                            id: service.id,
                            data: { isPublished: checked },
                          })
                        }
                      />
                    </label>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs font-medium text-muted-foreground">
                      Status
                    </span>
                    <NativeSelect
                      value={service.status}
                      onChange={(e) =>
                        update.mutate({
                          id: service.id,
                          data: {
                            status: e.target.value as ApiService["status"],
                          },
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
                        update.mutate({
                          id: service.id,
                          data: {
                            pricingType: e.target
                              .value as ApiService["pricingType"],
                          },
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

                  <div className="flex flex-col justify-end">
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
                      <ExternalLink className="size-4" />
                      Lihat di Directory
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default ApiServicesPage;
