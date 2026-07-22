import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import {
  fetchConversations,
  fetchMessages,
  closeConversation,
} from "./api";

/** Get all conversations (god only) */
export function useConversations() {
  return useQuery({
    queryKey: queryKeys.chat.conversations.list,
    queryFn: fetchConversations,
    refetchInterval: 10_000, // Poll every 10s for new conversations
  });
}

/** Get messages for a conversation (god only) */
export function useMessages(conversationId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.chat.messages(conversationId ?? ""),
    queryFn: () => fetchMessages(conversationId!),
    enabled: !!conversationId,
    refetchInterval: 5_000, // Poll every 5s for new messages
  });
}

/** Close a conversation (god only) */
export function useCloseConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (conversationId: string) => closeConversation(conversationId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.chat.conversations.list,
      });
    },
  });
}
