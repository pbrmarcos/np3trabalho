import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createAdminClient } from "../_shared/supabase.ts";
import { requireAdmin } from "../_shared/auth.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { createLogger } from "../_shared/logging.ts";

const log = createLogger("CREATE-STRIPE-PRICES");

interface PlanConfig {
  name: string;
  price: number; // Monthly price in BRL
  product_id?: string;
}

interface PeriodConfig {
  key: string;
  label: string;
  months: number;
  discount: number;
  recurring: boolean;
}

const periods: PeriodConfig[] = [
  { key: 'monthly', label: 'Mensal', months: 1, discount: 0, recurring: true },
  { key: 'semester', label: 'Semestral', months: 6, discount: 10, recurring: false },
  { key: 'annual', label: 'Anual', months: 12, discount: 15, recurring: false },
  { key: 'biennial', label: 'Bienal', months: 24, discount: 20, recurring: false },
];

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    log("Function started");

    const supabase = createAdminClient();

    // Verify admin role
    const authResult = await requireAdmin(req, supabase, corsHeaders);
    if (authResult.error) return authResult.error;
    const user = authResult.user;

    log("Admin verified", { userId: user.id });

    const { plans } = await req.json();
    
    if (!plans || typeof plans !== 'object') {
      throw new Error("Invalid request: plans object required");
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const results: Record<string, any> = {};
    const createdPrices: Record<string, Record<string, string>> = {
      basic: {},
      professional: {},
      performance: {},
    };

    for (const [planKey, planConfig] of Object.entries(plans)) {
      const config = planConfig as PlanConfig;
      if (!config.name || !config.price) {
        log(`Skipping plan ${planKey} - missing name or price`);
        continue;
      }

      log(`Processing plan: ${planKey}`, config);

      let productId = config.product_id;

      // Create product if no product_id exists
      if (!productId) {
        const product = await stripe.products.create({
          name: `WebQ - ${config.name}`,
          description: `Plano de hospedagem ${config.name}`,
          metadata: {
            plan_key: planKey,
            created_by: 'lovable_auto',
          },
        });
        productId = product.id;
        log(`Created product for ${planKey}`, { productId });
      } else {
        // Verify product exists
        try {
          await stripe.products.retrieve(productId);
          log(`Product exists for ${planKey}`, { productId });
        } catch {
          // Create new product if not found
          const product = await stripe.products.create({
            name: `WebQ - ${config.name}`,
            description: `Plano de hospedagem ${config.name}`,
            metadata: {
              plan_key: planKey,
              created_by: 'lovable_auto',
            },
          });
          productId = product.id;
          log(`Created new product for ${planKey}`, { productId });
        }
      }

      results[planKey] = { productId, prices: {} };

      // Create prices for each period
      for (const period of periods) {
        const baseMonthly = config.price * 100; // Convert to cents
        const fullPrice = baseMonthly * period.months;
        const discountMultiplier = 1 - (period.discount / 100);
        const finalPrice = Math.round(fullPrice * discountMultiplier);

        try {
          let priceParams: Stripe.PriceCreateParams = {
            product: productId,
            currency: 'brl',
            unit_amount: finalPrice,
            nickname: `${config.name} - ${period.label}`,
            metadata: {
              plan_key: planKey,
              period: period.key,
              discount_percent: String(period.discount),
              created_by: 'lovable_auto',
            },
          };

          if (period.recurring) {
            priceParams.recurring = { interval: 'month' };
          }

          const price = await stripe.prices.create(priceParams);
          
          results[planKey].prices[period.key] = {
            priceId: price.id,
            amount: finalPrice,
            recurring: period.recurring,
          };
          
          createdPrices[planKey as keyof typeof createdPrices][period.key] = price.id;
          
          log(`Created price for ${planKey} - ${period.key}`, { 
            priceId: price.id, 
            amount: finalPrice 
          });
        } catch (err: any) {
          log.error(`Error creating price for ${planKey} - ${period.key}`, { error: err.message });
          results[planKey].prices[period.key] = { error: err.message };
        }
      }
    }

    // Log action
    await supabase.from('action_logs').insert({
      user_id: user.id,
      user_email: user.email || 'unknown',
      action_type: 'create',
      entity_type: 'stripe_prices',
      entity_name: 'Hosting Price IDs',
      description: 'Produtos e preços criados automaticamente no Stripe',
      new_value: createdPrices,
    });

    return new Response(JSON.stringify({ 
      success: true, 
      results,
      priceIds: createdPrices,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log.error("Error in function", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
