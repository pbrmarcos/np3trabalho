import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNotificationSound } from "@/hooks/useNotificationSound";

export function useMigrationNotifications() {
  const queryClient = useQueryClient();
  const { playNotificationSound } = useNotificationSound();

  useEffect(() => {
    const channel = supabase
      .channel("migration-requests-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "migration_requests",
        },
        (payload) => {
          console.log("New migration request:", payload);
          
          // Invalidate queries to refresh data
          queryClient.invalidateQueries({ queryKey: ["migration-requests"] });
          queryClient.invalidateQueries({ queryKey: ["admin-demands-migrations"] });
          
          // Play notification sound
          playNotificationSound("default");
          
          // Show toast notification
          const newRequest = payload.new as { name: string; current_domain: string };
          toast.info("Nova solicitação de migração", {
            description: `${newRequest.name} - ${newRequest.current_domain}`,
            duration: 8000,
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "migration_requests",
        },
        () => {
          // Refresh data on updates
          queryClient.invalidateQueries({ queryKey: ["migration-requests"] });
          queryClient.invalidateQueries({ queryKey: ["admin-demands-migrations"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, playNotificationSound]);
}
