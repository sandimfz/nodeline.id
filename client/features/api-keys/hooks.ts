import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import {
  createApiKey,
  listApiKeys,
  revokeApiKey,
  getApiKeyUsage,
} from "./api";
import type { CreateApiKeyInput } from "./types";

/**
 * Hook to list all API keys.
 */
export function useApiKeys() {
  return useQuery({
    queryKey: queryKeys.apiKeys.list,
    queryFn: listApiKeys,
    staleTime: 30_000,
  });
}

/**
 * Hook to create a new API key.
 */
export function useCreateApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateApiKeyInput) => createApiKey(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.apiKeys.list });
    },
  });
}

/**
 * Hook to revoke an API key.
 */
export function useRevokeApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => revokeApiKey(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.apiKeys.list });
    },
  });
}

/**
 * Hook to get usage stats for a specific API key.
 */
export function useApiKeyUsage(id: string) {
  return useQuery({
    queryKey: queryKeys.apiKeys.usage(id),
    queryFn: () => getApiKeyUsage(id),
    enabled: !!id,
  });
}
