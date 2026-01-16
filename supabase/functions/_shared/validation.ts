// ============================================
// SCHEMAS DE VALIDAÇÃO E SANITIZAÇÃO
// ============================================

import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// ============================================
// SCHEMAS COMUNS
// ============================================

export const uuidSchema = z.string().uuid({ message: "ID inválido" });

export const emailSchema = z.string().email({ message: "Email inválido" });

export const priceIdSchema = z
  .string()
  .regex(/^price_[a-zA-Z0-9]+$/, { message: "Price ID inválido" });

export const productIdSchema = z
  .string()
  .regex(/^prod_[a-zA-Z0-9]+$/, { message: "Product ID inválido" });

export const couponIdSchema = z
  .string()
  .min(1, { message: "Coupon ID é obrigatório" });

export const promoCodeSchema = z
  .string()
  .min(1, { message: "Código promocional é obrigatório" })
  .max(50, { message: "Código muito longo" })
  .regex(/^[A-Z0-9_-]+$/i, { message: "Código contém caracteres inválidos" });

// ============================================
// SANITIZAÇÃO DE ENTRADA
// ============================================

/**
 * Sanitiza uma string removendo caracteres potencialmente perigosos
 * @param input - String de entrada
 * @param maxLength - Tamanho máximo (default: 1000)
 */
export function sanitizeString(input: string, maxLength = 1000): string {
  if (typeof input !== "string") {
    return "";
  }

  return input
    .trim()
    .slice(0, maxLength)
    // Remove caracteres de controle (exceto newlines e tabs)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    // Normaliza espaços múltiplos
    .replace(/\s+/g, " ");
}

/**
 * Sanitiza um objeto recursivamente
 * @param obj - Objeto a ser sanitizado
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const result = {} as T;

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string") {
      (result as Record<string, unknown>)[key] = sanitizeString(value);
    } else if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      (result as Record<string, unknown>)[key] = sanitizeObject(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      (result as Record<string, unknown>)[key] = value.map((item) =>
        typeof item === "string"
          ? sanitizeString(item)
          : item !== null && typeof item === "object"
          ? sanitizeObject(item as Record<string, unknown>)
          : item
      );
    } else {
      (result as Record<string, unknown>)[key] = value;
    }
  }

  return result;
}

/**
 * Valida e sanitiza uma requisição JSON
 * @param req - Request object
 * @param schema - Zod schema para validação
 * @param corsHeaders - Headers CORS
 */
export async function validateRequestBody<T extends z.ZodType>(
  req: Request,
  schema: T,
  corsHeaders: Record<string, string>
): Promise<{ data: z.infer<T>; error?: never } | { data?: never; error: Response }> {
  try {
    const rawBody = await req.json();
    const sanitized = sanitizeObject(rawBody);
    const parsed = schema.safeParse(sanitized);

    if (!parsed.success) {
      const errors = parsed.error.errors.map((e) => e.message).join(", ");
      return {
        error: new Response(
          JSON.stringify({ error: `Dados inválidos: ${errors}` }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        ),
      };
    }

    return { data: parsed.data };
  } catch {
    return {
      error: new Response(
        JSON.stringify({ error: "Corpo da requisição inválido" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      ),
    };
  }
}

// Re-export zod para conveniência
export { z };
