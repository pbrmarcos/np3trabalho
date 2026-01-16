import { useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useNotificationSound } from "@/hooks/useNotificationSound";
import { perfMonitor } from "@/lib/performanceMonitor";

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string | null;
  reference_id: string | null;
  reference_type: string | null;
  read: boolean;
  created_at: string;
}

export function useNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { playNotificationSound } = useNotificationSound();
  const isFirstLoadRef = useRef(true);

  // Fetch notifications
  const { data: notifications, isLoading, refetch } = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      return perfMonitor.measureAsync("useNotifications:fetch", async () => {
        const { data, error } = await supabase
          .from("notifications")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50);

        if (error) throw error;
        return data as Notification[];
      });
    },
    enabled: !!user?.id,
    staleTime: 30000,
  });

  // Count unread notifications
  const unreadCount = notifications?.filter((n) => !n.read).length || 0;

  // Mark single notification as read
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
    },
  });

  // Mark all notifications as read
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) return;
      
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", user.id)
        .eq("read", false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
    },
  });

  // Delete notification
  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
    },
  });

  // Clear all notifications
  const clearAllMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) return;
      
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
    },
  });

  // Setup realtime subscription
  useEffect(() => {
    if (!user?.id) return;

    // Mark first load as complete after a short delay
    const timer = setTimeout(() => {
      isFirstLoadRef.current = false;
    }, 2000);

    const channel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          
          // Play notification sound only after initial load
          if (!isFirstLoadRef.current) {
            // Determine notification type for sound
            let soundType: "ticket" | "file" | "brand" | "design" | "message" | "project" | "payment" | "default" = "default";
            if (newNotification.type?.includes("ticket")) {
              soundType = "ticket";
            } else if (newNotification.type?.includes("file")) {
              soundType = "file";
            } else if (newNotification.type?.includes("brand")) {
              soundType = "brand";
            } else if (newNotification.type?.includes("design")) {
              soundType = "design";
            } else if (newNotification.type?.includes("message") || newNotification.type?.includes("admin_message")) {
              soundType = "message";
            } else if (newNotification.type?.includes("project")) {
              soundType = "project";
            } else if (newNotification.type?.includes("payment") || newNotification.type?.includes("subscription")) {
              soundType = "payment";
            }
            playNotificationSound(soundType);
          }
          
          // Show toast for new notification
          toast(newNotification.title, {
            description: newNotification.message || undefined,
          });
          
          // Refetch notifications
          queryClient.invalidateQueries({ queryKey: ["notifications", user.id] });
        }
      )
      .subscribe();

    return () => {
      clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient, playNotificationSound]);

  // Also subscribe to ticket changes for realtime updates
  useEffect(() => {
    if (!user?.id) return;

    const ticketChannel = supabase
      .channel("tickets-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "project_tickets",
        },
        () => {
          // Refetch notifications when tickets change
          refetch();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "ticket_messages",
        },
        () => {
          // Refetch notifications when new messages are added
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ticketChannel);
    };
  }, [user?.id, refetch]);

  return {
    notifications: notifications || [],
    unreadCount,
    isLoading,
    markAsRead: markAsReadMutation.mutate,
    markAllAsRead: markAllAsReadMutation.mutate,
    deleteNotification: deleteNotificationMutation.mutate,
    clearAll: clearAllMutation.mutate,
    refetch,
  };
}
