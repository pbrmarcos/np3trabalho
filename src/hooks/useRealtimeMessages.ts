import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNotificationSound } from "@/hooks/useNotificationSound";
import { toast } from "sonner";

interface UseRealtimeMessagesOptions {
  userId?: string;
  enabled?: boolean;
}

export function useRealtimeMessages({ userId, enabled = true }: UseRealtimeMessagesOptions) {
  const queryClient = useQueryClient();
  const { playNotificationSound } = useNotificationSound();

  useEffect(() => {
    if (!userId || !enabled) return;

    console.log("[REALTIME] Setting up timeline_messages subscription for user:", userId);

    const timelineChannel = supabase
      .channel("timeline-messages-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "timeline_messages",
          filter: `client_id=eq.${userId}`,
        },
        (payload) => {
          console.log("[REALTIME] New admin message received:", payload);

          // Invalidate queries to refresh data
          queryClient.invalidateQueries({ queryKey: ["client-timeline", userId] });
          queryClient.invalidateQueries({ queryKey: ["client-timeline-full", userId] });
          queryClient.invalidateQueries({ queryKey: ["client-admin-messages", userId] });
          queryClient.invalidateQueries({ queryKey: ["client-unread-notifications", userId] });
          queryClient.invalidateQueries({ queryKey: ["client-unread-admin-messages"] });
          queryClient.invalidateQueries({ queryKey: ["client-latest-unread-message", userId] });
          queryClient.invalidateQueries({ queryKey: ["project-messages-data"] });

          // Play notification sound for messages
          playNotificationSound("message");

          // Show toast notification
          const message = (payload.new as any)?.message || "Nova atualização disponível";
          toast.info("Nova mensagem da WebQ", {
            description: message.length > 80 ? message.substring(0, 80) + "..." : message,
            duration: 6000,
          });
        }
      )
      .subscribe((status) => {
        console.log("[REALTIME] timeline_messages status:", status);
      });

    // Fallback: some environments only push realtime reliably for notifications.
    // When an admin_message notification arrives, force-refresh timeline + popup queries.
    const notificationsChannel = supabase
      .channel("client-notifications-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const type = (payload.new as any)?.type;
          if (type !== "admin_message") return;

          queryClient.invalidateQueries({ queryKey: ["client-timeline", userId] });
          queryClient.invalidateQueries({ queryKey: ["client-timeline-full", userId] });
          queryClient.invalidateQueries({ queryKey: ["client-admin-messages", userId] });
          queryClient.invalidateQueries({ queryKey: ["client-unread-notifications", userId] });
          queryClient.invalidateQueries({ queryKey: ["client-unread-admin-messages", userId] });
          queryClient.invalidateQueries({ queryKey: ["client-latest-unread-message", userId] });
        }
      )
      .subscribe((status) => {
        console.log("[REALTIME] notifications status:", status);
      });

    return () => {
      console.log("[REALTIME] Cleaning up realtime subscriptions");
      supabase.removeChannel(timelineChannel);
      supabase.removeChannel(notificationsChannel);
    };
  }, [userId, enabled, queryClient, playNotificationSound]);
}
