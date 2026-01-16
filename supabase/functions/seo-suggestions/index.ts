import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { createLogger } from "../_shared/logging.ts";

const logger = createLogger("SEO-SUGGESTIONS");

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, description, keywords, pageName, pageRoute } = await req.json();
    
    logger.info("SEO Suggestions request", { pageName, pageRoute, title: title?.substring(0, 30) });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      logger.error("LOVABLE_API_KEY is not configured");
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `Você é um especialista em SEO (Search Engine Optimization) brasileiro. 
Analise os dados de SEO fornecidos e gere sugestões práticas e acionáveis para melhorar o posicionamento nos mecanismos de busca.

Regras:
- Responda APENAS em português brasileiro
- Seja específico e prático nas sugestões
- Considere o contexto da página (nome e rota)
- Foque em melhorias que realmente impactam o ranking
- Limite a 5 sugestões principais
- Use linguagem clara e direta

Retorne um JSON com o seguinte formato:
{
  "suggestions": [
    {
      "type": "title" | "description" | "keywords" | "general",
      "priority": "high" | "medium" | "low",
      "suggestion": "Sugestão específica",
      "example": "Exemplo de implementação (quando aplicável)"
    }
  ],
  "improvedTitle": "Sugestão de título melhorado (se aplicável)",
  "improvedDescription": "Sugestão de descrição melhorada (se aplicável)"
}`;

    const userPrompt = `Analise os seguintes dados de SEO da página "${pageName}" (${pageRoute}):

Título atual: "${title || 'Não definido'}"
Descrição atual: "${description || 'Não definida'}"
Palavras-chave: "${keywords || 'Não definidas'}"

Gere sugestões de melhoria considerando:
1. O título deve ter entre 50-60 caracteres e incluir a palavra-chave principal
2. A descrição deve ter entre 150-160 caracteres e ser persuasiva
3. As palavras-chave devem estar presentes no título e descrição
4. O conteúdo deve ser relevante para a página específica
5. Considere boas práticas de SEO para 2024

Retorne APENAS o JSON, sem explicações adicionais.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      logger.error("AI gateway error", { status: response.status, error: errorText });
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    // Parse JSON from response (handle markdown code blocks)
    let jsonContent = content;
    if (content.includes("```json")) {
      jsonContent = content.replace(/```json\n?/g, "").replace(/```\n?/g, "");
    } else if (content.includes("```")) {
      jsonContent = content.replace(/```\n?/g, "");
    }

    const suggestions = JSON.parse(jsonContent.trim());

    return new Response(JSON.stringify(suggestions), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    logger.error("Error in seo-suggestions", { error: error instanceof Error ? error.message : error });
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro ao gerar sugestões" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
