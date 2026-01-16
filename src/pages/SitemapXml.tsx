import { useEffect } from "react";

export default function SitemapXml() {
  useEffect(() => {
    // Redirect to the edge function with the production base URL
    const baseUrl = "https://webq.com.br";
    const sitemapUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-sitemap?baseUrl=${encodeURIComponent(baseUrl)}`;
    window.location.href = sitemapUrl;
  }, []);

  return null;
}
