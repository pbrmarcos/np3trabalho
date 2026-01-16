import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Mail, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

interface EmailStats {
  failed: number;
  skipped: number;
  total: number;
}

export function EmailStatusAlert() {
  const { data: stats } = useQuery({
    queryKey: ["email-status-alert-24h"],
    queryFn: async (): Promise<EmailStats> => {
      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

      const { data, error } = await supabase
        .from("email_logs")
        .select("status")
        .gte("created_at", twentyFourHoursAgo.toISOString());

      if (error) throw error;

      const counts = {
        failed: 0,
        skipped: 0,
        total: data?.length || 0,
      };

      data?.forEach((item) => {
        if (item.status === "failed") counts.failed++;
        if (item.status === "skipped") counts.skipped++;
      });

      return counts;
    },
    refetchInterval: 60000, // Refresh every minute
    staleTime: 30000,
  });

  const problemCount = (stats?.failed || 0) + (stats?.skipped || 0);
  
  // Show alert if more than 3 problematic emails in last 24h
  if (problemCount < 3) return null;

  const isCritical = stats?.failed && stats.failed >= 3;

  return (
    <Alert className={isCritical ? "border-destructive bg-destructive/10" : "border-amber-500 bg-amber-500/10"}>
      <AlertTriangle className={`h-4 w-4 ${isCritical ? "text-destructive" : "text-amber-500"}`} />
      <AlertTitle className={isCritical ? "text-destructive" : "text-amber-600 dark:text-amber-400"}>
        Problemas de E-mail Detectados
      </AlertTitle>
      <AlertDescription className="flex items-center justify-between">
        <span className="text-muted-foreground">
          {stats?.failed ? `${stats.failed} falhas` : ""} 
          {stats?.failed && stats?.skipped ? " e " : ""}
          {stats?.skipped ? `${stats.skipped} ignorados` : ""} nas últimas 24h
        </span>
        <Link to="/admin/emails">
          <Button variant="ghost" size="sm" className="ml-2">
            <Mail className="h-4 w-4 mr-1" />
            Ver logs
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </Link>
      </AlertDescription>
    </Alert>
  );
}
