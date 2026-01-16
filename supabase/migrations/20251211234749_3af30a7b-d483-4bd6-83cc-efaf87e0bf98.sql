
-- Step 1: Create design_orders for existing brand deliveries that don't have one yet
INSERT INTO public.design_orders (client_id, package_id, status, payment_status, max_revisions, revisions_used, notes, created_at, updated_at)
SELECT DISTINCT 
  bd.client_id,
  'pkg-brand-creation' as package_id,
  CASE 
    WHEN co.brand_status = 'approved' THEN 'completed'
    WHEN co.brand_status = 'pending_review' THEN 'in_review'
    ELSE 'in_progress'
  END as status,
  'paid' as payment_status,
  2 as max_revisions,
  COALESCE(co.brand_revisions_used, 0) as revisions_used,
  'Migrado do sistema antigo de brand_deliveries' as notes,
  bd.created_at,
  bd.updated_at
FROM public.brand_deliveries bd
JOIN public.client_onboarding co ON co.id = bd.onboarding_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.design_orders dord 
  WHERE dord.client_id = bd.client_id 
  AND dord.package_id = 'pkg-brand-creation'
);

-- Step 2: Migrate brand_deliveries to design_deliveries
INSERT INTO public.design_deliveries (order_id, version_number, status, delivery_notes, created_at, updated_at)
SELECT 
  dord.id as order_id,
  bd.version_number,
  bd.status,
  bd.delivery_notes,
  bd.created_at,
  bd.updated_at
FROM public.brand_deliveries bd
JOIN public.client_onboarding co ON co.id = bd.onboarding_id
JOIN public.design_orders dord ON dord.client_id = bd.client_id AND dord.package_id = 'pkg-brand-creation'
WHERE NOT EXISTS (
  SELECT 1 FROM public.design_deliveries dd 
  WHERE dd.order_id = dord.id 
  AND dd.version_number = bd.version_number
);

-- Step 3: Migrate brand_delivery_files to design_delivery_files
INSERT INTO public.design_delivery_files (delivery_id, file_name, file_url, file_type, created_at)
SELECT 
  dd.id as delivery_id,
  bdf.file_name,
  bdf.file_url,
  bdf.file_type,
  bdf.created_at
FROM public.brand_delivery_files bdf
JOIN public.brand_deliveries bd ON bd.id = bdf.delivery_id
JOIN public.client_onboarding co ON co.id = bd.onboarding_id
JOIN public.design_orders dord ON dord.client_id = bd.client_id AND dord.package_id = 'pkg-brand-creation'
JOIN public.design_deliveries dd ON dd.order_id = dord.id AND dd.version_number = bd.version_number
WHERE NOT EXISTS (
  SELECT 1 FROM public.design_delivery_files ddf 
  WHERE ddf.delivery_id = dd.id 
  AND ddf.file_name = bdf.file_name
);

-- Step 4: Migrate brand_feedback to design_feedback
INSERT INTO public.design_feedback (delivery_id, user_id, feedback_type, comment, created_at)
SELECT 
  dd.id as delivery_id,
  bf.user_id,
  bf.feedback_type,
  bf.comment,
  bf.created_at
FROM public.brand_feedback bf
JOIN public.brand_deliveries bd ON bd.id = bf.delivery_id
JOIN public.client_onboarding co ON co.id = bd.onboarding_id
JOIN public.design_orders dord ON dord.client_id = bd.client_id AND dord.package_id = 'pkg-brand-creation'
JOIN public.design_deliveries dd ON dd.order_id = dord.id AND dd.version_number = bd.version_number
WHERE NOT EXISTS (
  SELECT 1 FROM public.design_feedback df 
  WHERE df.delivery_id = dd.id 
  AND df.user_id = bf.user_id
  AND df.feedback_type = bf.feedback_type
);

-- Step 5: Drop old tables (in correct order due to foreign keys)
DROP TABLE IF EXISTS public.brand_feedback CASCADE;
DROP TABLE IF EXISTS public.brand_delivery_files CASCADE;
DROP TABLE IF EXISTS public.brand_deliveries CASCADE;
