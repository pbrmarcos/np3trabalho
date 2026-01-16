-- Add is_isolated_page column to blog_posts table
ALTER TABLE public.blog_posts 
ADD COLUMN is_isolated_page boolean DEFAULT false;