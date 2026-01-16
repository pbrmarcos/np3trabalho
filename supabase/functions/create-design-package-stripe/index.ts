import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createAdminClient } from "../_shared/supabase.ts";
import { requireAdmin } from "../_shared/auth.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { createLogger } from "../_shared/logging.ts";

const log = createLogger("CREATE-DESIGN-PACKAGE-STRIPE");

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

    const { package_id } = await req.json();
    
    if (!package_id) {
      throw new Error("package_id is required");
    }

    // Get the package from database
    const { data: pkg, error: pkgError } = await supabase
      .from('design_packages')
      .select('*, design_service_categories(name)')
      .eq('id', package_id)
      .single();

    if (pkgError || !pkg) {
      throw new Error(`Package not found: ${pkgError?.message || 'Unknown error'}`);
    }

    log("Package found", { id: pkg.id, name: pkg.name, price: pkg.price });

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    let productId = pkg.stripe_product_id;
    let priceId = pkg.stripe_price_id;

    // Create product if doesn't exist
    if (!productId) {
      const categoryName = pkg.design_service_categories?.name || 'Design';
      const product = await stripe.products.create({
        name: `${pkg.name}`,
        description: pkg.description || `Serviço de design - ${categoryName}`,
        metadata: {
          package_id: pkg.id,
          category_id: pkg.category_id,
          created_by: 'lovable_auto',
        },
      });
      productId = product.id;
      log("Created Stripe product", { productId });
    } else {
      // Verify product exists
      try {
        await stripe.products.retrieve(productId);
        log("Product exists", { productId });
      } catch {
        // Create new product if not found
        const categoryName = pkg.design_service_categories?.name || 'Design';
        const product = await stripe.products.create({
          name: `${pkg.name}`,
          description: pkg.description || `Serviço de design - ${categoryName}`,
          metadata: {
            package_id: pkg.id,
            category_id: pkg.category_id,
            created_by: 'lovable_auto',
          },
        });
        productId = product.id;
        log("Created new Stripe product (old was invalid)", { productId });
      }
    }

    // Create price if doesn't exist
    if (!priceId) {
      const priceInCents = Math.round(Number(pkg.price) * 100);
      const price = await stripe.prices.create({
        product: productId,
        currency: 'brl',
        unit_amount: priceInCents,
        nickname: pkg.name,
        metadata: {
          package_id: pkg.id,
          created_by: 'lovable_auto',
        },
      });
      priceId = price.id;
      log("Created Stripe price", { priceId, amount: priceInCents });
    } else {
      // Verify price exists and is valid
      try {
        const existingPrice = await stripe.prices.retrieve(priceId);
        if (!existingPrice.active) {
          throw new Error("Price is inactive");
        }
        log("Price exists and is active", { priceId });
      } catch {
        // Create new price if not found or inactive
        const priceInCents = Math.round(Number(pkg.price) * 100);
        const price = await stripe.prices.create({
          product: productId,
          currency: 'brl',
          unit_amount: priceInCents,
          nickname: pkg.name,
          metadata: {
            package_id: pkg.id,
            created_by: 'lovable_auto',
          },
        });
        priceId = price.id;
        log("Created new Stripe price (old was invalid/inactive)", { priceId });
      }
    }

    // Update package with Stripe IDs
    const { error: updateError } = await supabase
      .from('design_packages')
      .update({
        stripe_product_id: productId,
        stripe_price_id: priceId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', package_id);

    if (updateError) {
      throw new Error(`Failed to update package: ${updateError.message}`);
    }

    log("Package updated with Stripe IDs", { productId, priceId });

    // Log action
    await supabase.from('action_logs').insert({
      user_id: user.id,
      user_email: user.email || 'unknown',
      action_type: 'create',
      entity_type: 'stripe_product',
      entity_id: package_id,
      entity_name: pkg.name,
      description: `Produto e preço Stripe criados para pacote de design: ${pkg.name}`,
      new_value: { productId, priceId },
    });

    return new Response(JSON.stringify({ 
      success: true, 
      package_id,
      stripe_product_id: productId,
      stripe_price_id: priceId,
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
