import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/contexts/ThemeContext";

interface BrandLogosConfig {
  fullLogoLight: string;  // Logo escuro (para tema claro)
  fullLogoDark: string;   // Logo claro (para tema escuro)
  simpleLogoLight: string; // Logo simples escuro (para tema claro)
  simpleLogoDark: string;  // Logo simples claro (para tema escuro)
}

const DEFAULT_CONFIG: BrandLogosConfig = {
  fullLogoLight: "",
  fullLogoDark: "",
  simpleLogoLight: "",
  simpleLogoDark: "",
};

export function useBrandLogos() {
  const { theme } = useTheme();

  const { data: config, isLoading } = useQuery({
    queryKey: ["brand-logos-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "brand_logos_config")
        .maybeSingle();

      if (error) {
        console.error("Error fetching brand logos config:", error);
        return DEFAULT_CONFIG;
      }

      return (data?.value as unknown as BrandLogosConfig) || DEFAULT_CONFIG;
    },
    staleTime: 0, // Always fetch fresh data
    refetchOnWindowFocus: true,
  });

  const safeConfig = config || DEFAULT_CONFIG;

  // Seleciona o logo correto baseado no tema atual
  const fullLogo = theme === "dark" ? safeConfig.fullLogoDark : safeConfig.fullLogoLight;
  const simpleLogo = theme === "dark" ? safeConfig.simpleLogoDark : safeConfig.simpleLogoLight;

  return {
    fullLogo,
    simpleLogo,
    config: safeConfig,
    isLoading,
  };
}
