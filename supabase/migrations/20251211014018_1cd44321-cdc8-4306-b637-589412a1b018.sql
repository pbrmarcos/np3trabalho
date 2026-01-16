-- Add SEO fields to blog_posts table
ALTER TABLE public.blog_posts
ADD COLUMN IF NOT EXISTS meta_description text,
ADD COLUMN IF NOT EXISTS keywords text,
ADD COLUMN IF NOT EXISTS og_title text,
ADD COLUMN IF NOT EXISTS og_description text,
ADD COLUMN IF NOT EXISTS og_image text;