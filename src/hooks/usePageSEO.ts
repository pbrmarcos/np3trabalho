import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PageSEO {
  id: string;
  page_key: string;
  page_name: string;
  page_route: string;
  title: string | null;
  meta_description: string | null;
  og_title: string | null;
  og_description: string | null;
  og_image: string | null;
  keywords: string | null;
  created_at: string;
  updated_at: string;
}

export function usePageSEO(pageKey: string) {
  return useQuery({
    queryKey: ['page-seo', pageKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('page_seo')
        .select('*')
        .eq('page_key', pageKey)
        .maybeSingle();
      
      if (error) throw error;
      return data as PageSEO | null;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useAllPageSEO() {
  return useQuery({
    queryKey: ['page-seo-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('page_seo')
        .select('*')
        .order('page_name');
      
      if (error) throw error;
      return data as PageSEO[];
    },
  });
}
