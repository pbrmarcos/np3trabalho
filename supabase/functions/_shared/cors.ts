// ============================================
// CONFIGURAÇÃO CENTRALIZADA DE CORS
// ============================================

// Origens permitidas
export const ALLOWED_ORIGINS = [
  "https://webq.com.br",
  "https://www.webq.com.br",
  "http://localhost:5173",
  "http://localhost:8080",
];

// URL de produção para fallback
export const PRODUCTION_URL = "https://webq.com.br";

/**
 * Retorna headers CORS configurados com base na origem da requisição
 * @param origin - Header 'origin' da requisição
 * @param additionalHeaders - Headers adicionais para permitir (opcional)
 */
export function getCorsHeaders(origin: string | null, additionalHeaders?: string[]): Record<string, string> {
  // Verifica se a origem é permitida
  // - Se não há origem (cron jobs, chamadas internas), permite
  // - Se contém webq.com.br, permite
  // - Se está na lista de origens permitidas, permite
  const isAllowed = !origin || 
    origin.includes("webq.com.br") || 
    ALLOWED_ORIGINS.includes(origin);
  
  const baseHeaders = "authorization, x-client-info, apikey, content-type";
  const headers = additionalHeaders 
    ? `${baseHeaders}, ${additionalHeaders.join(", ")}`
    : baseHeaders;

  return {
    "Access-Control-Allow-Origin": isAllowed ? (origin || PRODUCTION_URL) : PRODUCTION_URL,
    "Access-Control-Allow-Headers": headers,
  };
}

/**
 * Headers CORS estáticos para funções simples
 */
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
