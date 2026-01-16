import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, FileText, Ticket, Mail, Settings, ImageIcon, UserCircle, HelpCircle, Search, FileCode, PenTool, Trash2, DollarSign, ClipboardList, RefreshCw, TicketPercent } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { DEVELOPER_EMAIL } from "@/lib/constants";

const baseMenuItems = [
  { title: "Dashboard", url: "/admin/dashboard", icon: LayoutDashboard },
  { title: "Clientes", url: "/admin/clients", icon: Users },
  { title: "Design Digital", url: "/admin/design", icon: PenTool },
  { title: "Migrações", url: "/admin/migrations", icon: RefreshCw, showBadge: "migrations" },
  { title: "Tickets", url: "/admin/tickets", icon: Ticket },
  { title: "Emails", url: "/admin/emails", icon: Mail },
  { title: "Blog", url: "/admin/blog", icon: FileText },
  { title: "Páginas", url: "/admin/paginas", icon: FileCode },
  { title: "SEO", url: "/admin/seo", icon: Search },
  { title: "Central de Ajuda", url: "/admin/ajuda", icon: HelpCircle },
  { title: "Financeiro", url: "/admin/financeiro", icon: DollarSign },
  { title: "Cupons", url: "/admin/cupons", icon: TicketPercent },
];

const mediaMenuItem = { title: "Mídia", url: "/admin/media", icon: ImageIcon };
const deleteClientMenuItem = { title: "Excluir Cliente", url: "/admin/delete-client", icon: Trash2 };
const logsMenuItem = { title: "Logs de Auditoria", url: "/admin/logs", icon: ClipboardList };
const settingsMenuItem = { title: "Configurações", url: "/admin/settings", icon: Settings };
const accountMenuItem = { title: "Minha Conta", url: "/admin/account", icon: UserCircle };

export default function AdminSidebar() {
  const location = useLocation();
  const { state } = useSidebar();
  const { user } = useAuth();
  const isCollapsed = state === "collapsed";
  const [pendingMigrations, setPendingMigrations] = useState(0);

  const isDeveloper = user?.email === DEVELOPER_EMAIL;

  // Fetch pending migrations count
  useEffect(() => {
    const fetchPendingMigrations = async () => {
      const { count } = await supabase
        .from("migration_requests")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");
      
      setPendingMigrations(count || 0);
    };

    fetchPendingMigrations();

    // Subscribe to realtime changes
    const channel = supabase
      .channel("migration-count")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "migration_requests" },
        () => fetchPendingMigrations()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Build menu items dynamically based on user
  const menuItems = [
    ...baseMenuItems,
    settingsMenuItem,
    ...(isDeveloper ? [mediaMenuItem, logsMenuItem, deleteClientMenuItem] : []),
    accountMenuItem,
  ];

  const isActive = (url: string) => {
    if (url === "/admin/dashboard") {
      return location.pathname === url;
    }
    return location.pathname.startsWith(url);
  };

  const getBadgeCount = (badgeType?: string) => {
    if (badgeType === "migrations") return pendingMigrations;
    return 0;
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-border/50">
      <SidebarContent className="pt-4">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1.5">
              {menuItems.map((item) => {
                const badgeCount = getBadgeCount((item as any).showBadge);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      tooltip={isCollapsed ? item.title : undefined}
                      className={cn(
                        "group/item transition-all duration-200 ease-out",
                        "hover:translate-x-0.5 hover:bg-sidebar-accent/80",
                        isActive(item.url) && "bg-primary/10 text-primary hover:bg-primary/15 ring-1 ring-primary/20 shadow-sm"
                      )}
                    >
                      <Link to={item.url} className="flex items-center gap-3">
                        <item.icon className={cn(
                          "h-4 w-4 shrink-0 transition-all duration-200 ease-out",
                          "group-hover/item:scale-110",
                          isActive(item.url) && "text-primary"
                        )} />
                        <span className={cn(
                          "transition-all duration-200 ease-out flex-1",
                          isCollapsed ? "opacity-0 w-0" : "opacity-100"
                        )}>
                          {item.title}
                        </span>
                        {badgeCount > 0 && !isCollapsed && (
                          <Badge variant="destructive" className="h-5 min-w-[20px] px-1.5 text-xs">
                            {badgeCount}
                          </Badge>
                        )}
                        {badgeCount > 0 && isCollapsed && (
                          <span className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 text-[10px] bg-destructive text-destructive-foreground rounded-full flex items-center justify-center">
                            {badgeCount}
                          </span>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
