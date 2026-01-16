-- Add category column to blog_posts table
ALTER TABLE public.blog_posts 
ADD COLUMN category text DEFAULT 'Site Profissional';

-- Update existing posts to have the default category
UPDATE public.blog_posts SET category = 'Site Profissional' WHERE category IS NULL;