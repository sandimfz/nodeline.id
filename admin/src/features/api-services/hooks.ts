import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { useToast } from "@/lib/toast";
import { extractApiError } from "@/lib/api-client";
import {
  fetchApiServices,
  updateApiService,
  deleteApiService,
  type ApiService,
  type ApiServiceListResult,
} from "./api";

export function useApiServices() {
  return useQuery({
    queryKey: queryKeys.apiServices.all,
    queryFn: fetchApiServices,
    staleTime: 30_000,
  });
}

type UpdatableFields = Partial<
  Pick<ApiService, "isPublished" | "status" | "name" | "shortDescription" | "pricingType">
>;

/**
 * Update a service. Optimistically applies the change so the switch responds
 * immediately, rolling back if the request fails.
 */
export function useUpdateApiService() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatableFields }) =>
      updateApiService(id, data),

    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.apiServices.all });
      const previous = queryClient.getQueryData<ApiServiceListResult>(
        queryKeys.apiServices.all,
      );

      queryClient.setQueryData<ApiServiceListResult>(
        queryKeys.apiServices.all,
        (old) => {
          if (!old) return old;
          return {
            ...old,
            services: old.services.map((s) =>
              s.id === id ? { ...s, ...data } : s,
            ),
          };
        },
      );

      return { previous };
    },

    onError: (err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.apiServices.all, context.previous);
      }
      toast.error(extractApiError(err));
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.apiServices.all });
    },
  });
}

export function useDeleteApiService() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (id: string) => deleteApiService(id),
    onSuccess: () => {
      toast.success("API service dihapus");
      void queryClient.invalidateQueries({ queryKey: queryKeys.apiServices.all });
    },
    onError: (err) => {
      toast.error(extractApiError(err));
    },
  });
}
