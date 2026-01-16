import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, User, Phone, Mail, Calendar, Palette, ShoppingCart, ExternalLink, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useDebounce } from "@/hooks/useDebounce";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DesignOnlyClient {
  user_id: string;
  full_name: string | null;
  company_name: string | null;
  phone: string | null;
  email: string;
  created_at: string;
  design_orders_count: number;
  has_onboarding: boolean;
}

export default function DesignOnlyClients() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 300);

  const { data: clients, isLoading } = useQuery({
    queryKey: ["design-only-clients", debouncedSearch],
    queryFn: async () => {
      // Get all client users
      const { data: clientRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "client");

      if (rolesError) throw rolesError;
      if (!clientRoles || clientRoles.length === 0) return [];

      const clientIds = clientRoles.map(r => r.user_id);

      // Get profiles for these users (now includes email column)
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, full_name, company_name, phone, email, created_at")
        .in("user_id", clientIds);

      if (profilesError) throw profilesError;

      // Get onboardings to filter out hosting clients
      const { data: onboardings, error: onboardingError } = await supabase
        .from("client_onboarding")
        .select("user_id")
        .in("user_id", clientIds);

      if (onboardingError) throw onboardingError;

      const onboardingUserIds = new Set(onboardings?.map(o => o.user_id) || []);

      // Get design orders count per client
      const { data: designOrders, error: ordersError } = await supabase
        .from("design_orders")
        .select("client_id")
        .in("client_id", clientIds);

      if (ordersError) throw ordersError;

      const orderCounts = (designOrders || []).reduce((acc, order) => {
        acc[order.client_id] = (acc[order.client_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Build the client list - only design-only (no onboarding)
      const designOnlyClients: DesignOnlyClient[] = (profiles || [])
        .filter(p => !onboardingUserIds.has(p.user_id))
        .map(p => ({
          user_id: p.user_id,
          full_name: p.full_name,
          company_name: p.company_name,
          phone: p.phone,
          email: p.email || "",
          created_at: p.created_at,
          design_orders_count: orderCounts[p.user_id] || 0,
          has_onboarding: false,
        }));

      // Apply search filter (now includes email)
      if (debouncedSearch) {
        const search = debouncedSearch.toLowerCase();
        return designOnlyClients.filter(c => 
          c.full_name?.toLowerCase().includes(search) ||
          c.company_name?.toLowerCase().includes(search) ||
          c.phone?.includes(search) ||
          c.email?.toLowerCase().includes(search)
        );
      }

      return designOnlyClients;
    },
    staleTime: 30000,
  });

  const isEmpty = !isLoading && (!clients || clients.length === 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-primary" />
              Clientes Design-Only
            </CardTitle>
            <CardDescription>
              Clientes cadastrados sem plano de hospedagem
            </CardDescription>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : isEmpty ? (
          <div className="text-center py-8 text-muted-foreground">
            <User className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="font-medium">Nenhum cliente design-only encontrado</p>
            <p className="text-sm">Clientes que se cadastrarem pelo fluxo de design aparecerão aqui.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {clients?.map(client => (
              <div
                key={client.user_id}
                className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-lg border bg-card hover:border-primary/50 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-foreground truncate">
                        {client.full_name || "Cliente sem nome"}
                      </span>
                      {client.company_name && (
                        <Badge variant="secondary" className="text-xs">
                          {client.company_name}
                        </Badge>
                      )}
                      {client.design_orders_count > 0 && (
                        <Badge className="text-xs bg-green-500/10 text-green-600 dark:text-green-400">
                          <ShoppingCart className="h-3 w-3 mr-1" />
                          {client.design_orders_count} pedido{client.design_orders_count > 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1 flex-wrap">
                      {client.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {client.email}
                        </span>
                      )}
                      {client.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {client.phone}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDistanceToNow(new Date(client.created_at), { addSuffix: true, locale: ptBR })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {client.phone && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(`https://wa.me/55${client.phone?.replace(/\D/g, "")}`, "_blank")}
                    >
                      <Phone className="h-4 w-4" />
                    </Button>
                  )}
                  {client.design_orders_count > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate("/admin/design")}
                    >
                      Ver Pedidos
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {clients && clients.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-xs text-muted-foreground text-center">
              💡 Estes clientes podem a qualquer momento assinar um plano de site ou solicitar uma migração.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
