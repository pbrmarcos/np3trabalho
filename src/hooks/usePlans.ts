import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PlanConfig {
  name: string;
  price: number;
  price_id: string;
  product_id: string;
  description?: string;
  features?: string[];
  popular?: boolean;
}

export function usePlans() {
  return useQuery({
    queryKey: ['public-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('key, value')
        .in('key', ['plan_basic', 'plan_professional', 'plan_performance']);
      
      if (error) throw error;
      
      const plans: Record<string, PlanConfig> = {};
      data?.forEach(item => {
        const key = item.key.replace('plan_', '');
        plans[key] = item.value as unknown as PlanConfig;
      });
      return plans;
    },
    staleTime: 0,
    refetchOnMount: true,
  });
}

export function getPlanByProjectPlan(
  plans: Record<string, PlanConfig> | undefined,
  projectPlan: string | null
): PlanConfig | null {
  if (!plans || !projectPlan) return null;
  
  const normalizedKey = projectPlan.toLowerCase().replace(/\s+/g, "").replace(/-/g, "");
  
  if (normalizedKey === "basic" || normalizedKey === "essencial") return plans.basic;
  if (normalizedKey === "professional" || normalizedKey === "profissional") return plans.professional;
  if (normalizedKey === "performance") return plans.performance;
  
  return plans[normalizedKey] || null;
}
