import { useState } from "react";
import { Bell, CheckCheck, Trash2, X, MessageSquare, Ticket, FileText, FolderOpen, Palette, Package, CreditCard, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotifications, Notification } from "@/hooks/useNotifications";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const typeConfig: Record<string, { icon: typeof Bell; color: string }> = {
  // Tickets
  new_ticket: { icon: Ticket, color: "text-blue-500" },
  ticket_response: { icon: MessageSquare, color: "text-green-500" },
  ticket_status_change: { icon: Ticket, color: "text-amber-500" },
  // Files
  new_file: { icon: FileText, color: "text-purple-500" },
  file_uploaded: { icon: FileText, color: "text-orange-500" },
  // Projects
  project_update: { icon: FolderOpen, color: "text-primary" },
  project_status: { icon: FolderOpen, color: "text-blue-500" },
  // Brand
  brand_delivery: { icon: Palette, color: "text-purple-500" },
  brand_approved: { icon: Palette, color: "text-green-500" },
  brand_revision: { icon: Palette, color: "text-amber-500" },
  // Design Orders
  design_order_created: { icon: Package, color: "text-blue-500" },
  design_order_delivered: { icon: Package, color: "text-purple-500" },
  design_order_approved: { icon: Package, color: "text-green-500" },
  design_order_revision: { icon: Package, color: "text-amber-500" },
  // Messages
  admin_message: { icon: MessageCircle, color: "text-primary" },
  timeline_message: { icon: MessageCircle, color: "text-primary" },
  // Payments
  payment_success: { icon: CreditCard, color: "text-green-500" },
  payment_failed: { icon: CreditCard, color: "text-red-500" },
  subscription_update: { icon: CreditCard, color: "text-amber-500" },
};

export default function NotificationBell() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
  } = useNotifications();

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read
    if (!notification.read) {
      markAsRead(notification.id);
    }

    setIsOpen(false);

    // Navigate based on type and role
    if (notification.reference_type === "ticket" && notification.reference_id) {
      // Fetch the project_id from the ticket
      const { data: ticket } = await supabase
        .from("project_tickets")
        .select("project_id")
        .eq("id", notification.reference_id)
        .single();

      if (ticket?.project_id) {
        if (isAdmin) {
          navigate(`/admin/project/${ticket.project_id}?tab=tickets&ticket=${notification.reference_id}`);
        } else {
          navigate(`/cliente/projeto/${ticket.project_id}/tickets?ticket=${notification.reference_id}`);
        }
      } else {
        navigate(isAdmin ? "/admin/dashboard" : "/cliente/dashboard");
      }
    } else if (notification.reference_type === "file" && notification.reference_id) {
      // Fetch the project_id from the file
      const { data: file } = await supabase
        .from("project_files")
        .select("project_id")
        .eq("id", notification.reference_id)
        .single();

      if (file?.project_id) {
        if (isAdmin) {
          navigate(`/admin/project/${file.project_id}?tab=files`);
        } else {
          navigate(`/cliente/projeto/${file.project_id}/arquivos`);
        }
      } else {
        navigate(isAdmin ? "/admin/dashboard" : "/cliente/dashboard");
      }
    } else if (notification.reference_type === "brand" || notification.type?.includes("brand")) {
      if (isAdmin) {
        navigate("/admin/design");
      } else {
        navigate("/cliente/design");
      }
    } else if (notification.reference_type === "design_order" && notification.reference_id) {
      if (isAdmin) {
        navigate(`/admin/design/${notification.reference_id}`);
      } else {
        navigate(`/cliente/design/${notification.reference_id}`);
      }
    } else if (notification.reference_type === "project" && notification.reference_id) {
      if (isAdmin) {
        navigate(`/admin/project/${notification.reference_id}`);
      } else {
        navigate("/cliente/dashboard");
      }
    } else if (notification.reference_type === "timeline_message") {
      navigate(isAdmin ? "/admin/dashboard" : "/cliente/dashboard");
    } else {
      // Default fallback
      navigate(isAdmin ? "/admin/dashboard" : "/cliente/dashboard");
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px]"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-semibold text-sm">Notificações</h3>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                onClick={() => markAllAsRead()}
              >
                <CheckCheck className="h-3.5 w-3.5 mr-1" />
                Marcar todas
              </Button>
            )}
          </div>
        </div>

        <ScrollArea className="h-80">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Bell className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">Nenhuma notificação</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((notification) => {
                const config = typeConfig[notification.type] || { icon: Bell, color: "text-muted-foreground" };
                const Icon = config.icon;

                return (
                  <div
                    key={notification.id}
                    className={cn(
                      "flex gap-3 p-4 hover:bg-muted/50 cursor-pointer transition-colors group",
                      !notification.read && "bg-primary/5"
                    )}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className={cn("mt-0.5 flex-shrink-0", config.color)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn(
                          "text-sm line-clamp-2",
                          !notification.read && "font-medium"
                        )}>
                          {notification.title}
                        </p>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notification.id);
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                      {notification.message && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                          {notification.message}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(notification.created_at), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </p>
                    </div>
                    {!notification.read && (
                      <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {notifications.length > 0 && (
          <div className="p-2 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs text-muted-foreground hover:text-destructive"
              onClick={() => clearAll()}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Limpar todas
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
