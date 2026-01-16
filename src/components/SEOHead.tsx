import { Helmet } from "react-helmet";
import { usePageSEO } from "@/hooks/usePageSEO";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface SEOHeadProps {
  pageKey: string;
  fallbackTitle: string;
  fallbackDescription: string;
  canonicalUrl?: string;
}

interface GoogleSearchConsoleConfig {
  verification_code?: string;
  sitemap_url?: string;
  property_url?: string;
}

export function SEOHead({ pageKey, fallbackTitle, fallbackDescription, canonicalUrl }: SEOHeadProps) {
  const { data: seo } = usePageSEO(pageKey);
  
  // Fetch Google Search Console config
  const { data: gscConfig } = useQuery({
    queryKey: ['gsc-config'],
    queryFn: async () => {
      const { data } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'google_search_console_config')
        .maybeSingle();
      return data?.value as GoogleSearchConsoleConfig | null;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const title = seo?.title || fallbackTitle;
  const description = seo?.meta_description || fallbackDescription;
  const ogTitle = seo?.og_title || title;
  const ogDescription = seo?.og_description || description;
  const ogImage = seo?.og_image;
  const keywords = seo?.keywords;

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      
      {/* Canonical URL */}
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}
      
      {/* Google Search Console Verification */}
      {gscConfig?.verification_code && (
        <meta name="google-site-verification" content={gscConfig.verification_code} />
      )}
      
      {/* Open Graph */}
      <meta property="og:title" content={ogTitle} />
      <meta property="og:description" content={ogDescription} />
      <meta property="og:type" content="website" />
      {ogImage && <meta property="og:image" content={ogImage} />}
      
      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={ogTitle} />
      <meta name="twitter:description" content={ogDescription} />
      {ogImage && <meta name="twitter:image" content={ogImage} />}
    </Helmet>
  );
}
