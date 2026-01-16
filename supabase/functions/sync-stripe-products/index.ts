import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createAdminClient } from "../_shared/supabase.ts";
import { requireAdmin } from "../_shared/auth.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { createLogger } from "../_shared/logging.ts";

const log = createLogger("SYNC-STRIPE-PRODUCTS");

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

    const supabaseClient = createAdminClient();

    // Verificar admin
    const authResult = await requireAdmin(req, supabaseClient, corsHeaders);
    if (authResult.error) return authResult.error;
    const user = authResult.user;

    log("Admin verified", { userId: user.id });

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const results: any = { hostingPlans: {}, designPackages: {} };

    // ========== 1. CREATE HOSTING PLANS ==========
    const hostingPlans = [
      { key: 'basic', name: 'Essencial', price: 149 },
      { key: 'professional', name: 'Profissional', price: 299 },
      { key: 'performance', name: 'Performance', price: 449 },
    ];

    const hostingPriceIds: Record<string, Record<string, string>> = {
      essencial: {}, profissional: {}, performance: {},
    };

    for (const plan of hostingPlans) {
      log(`Creating hosting product: ${plan.name}`);
      
      const product = await stripe.products.create({
        name: `WebQ - ${plan.name}`,
        description: `Plano de hospedagem ${plan.name}`,
        metadata: { plan_key: plan.key, type: 'hosting' },
      });
      
      log(`Created product: ${product.id}`);
      
      const planPrices: Record<string, any> = {};
      const priceIdKey = plan.key === 'basic' ? 'essencial' : (plan.key === 'professional' ? 'profissional' : 'performance');
      
      for (const period of periods) {
        const baseMonthly = plan.price * 100;
        const fullPrice = baseMonthly * period.months;
        const discountMultiplier = 1 - (period.discount / 100);
        const finalPrice = Math.round(fullPrice * discountMultiplier);

        const priceParams: Stripe.PriceCreateParams = {
          product: product.id, currency: 'brl', unit_amount: finalPrice,
          nickname: `${plan.name} - ${period.label}`,
          metadata: { plan_key: plan.key, period: period.key, discount_percent: String(period.discount) },
        };

        if (period.recurring) priceParams.recurring = { interval: 'month' };

        const price = await stripe.prices.create(priceParams);
        planPrices[period.key] = price.id;
        hostingPriceIds[priceIdKey][period.key] = price.id;
        
        log(`Created price: ${price.id} for ${plan.name} - ${period.label}`);
      }

      results.hostingPlans[plan.key] = { productId: product.id, priceId: planPrices.monthly, prices: planPrices };

      const settingsKey = `plan_${plan.key}`;
      const { data: existingSettings } = await supabaseClient.from('system_settings').select('value').eq('key', settingsKey).single();

      if (existingSettings) {
        const updatedValue = { ...existingSettings.value as object, product_id: product.id, price_id: planPrices.monthly };
        await supabaseClient.from('system_settings').update({ value: updatedValue, updated_at: new Date().toISOString() }).eq('key', settingsKey);
        log(`Updated system_settings: ${settingsKey}`);
      }
    }

    await supabaseClient.from('system_settings').upsert({
      key: 'hosting_price_ids', value: hostingPriceIds,
      description: 'Stripe Price IDs for hosting plans by billing period',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'key' });
    
    log("Updated hosting_price_ids");

    // ========== 2. CREATE DESIGN PACKAGES ==========
    const { data: designPackages } = await supabaseClient.from('design_packages').select('id, name, price, category_id, description').eq('is_active', true);

    if (designPackages) {
      for (const pkg of designPackages) {
        log(`Creating design package: ${pkg.name}`);
        
        const product = await stripe.products.create({
          name: `WebQ Design - ${pkg.name}`,
          description: pkg.description || `Serviço de design: ${pkg.name}`,
          metadata: { package_id: pkg.id, category_id: pkg.category_id, type: 'design' },
        });
        
        const price = await stripe.prices.create({
          product: product.id, currency: 'brl',
          unit_amount: Math.round(Number(pkg.price) * 100),
          nickname: pkg.name, metadata: { package_id: pkg.id },
        });
        
        log(`Created design price: ${price.id} for ${pkg.name}`);
        
        await supabaseClient.from('design_packages').update({
          stripe_product_id: product.id, stripe_price_id: price.id,
          updated_at: new Date().toISOString(),
        }).eq('id', pkg.id);
        
        results.designPackages[pkg.id] = { productId: product.id, priceId: price.id, name: pkg.name };
      }
    }

    // Log action
    await supabaseClient.from('action_logs').insert({
      user_id: user.id, user_email: user.email || 'unknown',
      action_type: 'create', entity_type: 'stripe_sync',
      entity_name: 'Full Stripe Products Sync',
      description: 'Todos os produtos e preços sincronizados com Stripe',
      new_value: results,
    });

    log("Sync completed successfully", { 
      hostingPlans: Object.keys(results.hostingPlans).length,
      designPackages: Object.keys(results.designPackages).length,
    });

    return new Response(JSON.stringify({ 
      success: true, results,
      message: `Criados ${Object.keys(results.hostingPlans).length} planos de hospedagem e ${Object.keys(results.designPackages).length} pacotes de design`,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log.error("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
