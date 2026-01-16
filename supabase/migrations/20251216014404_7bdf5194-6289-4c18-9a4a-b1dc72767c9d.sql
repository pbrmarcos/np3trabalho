-- Add SEO fields to help_articles table
ALTER TABLE help_articles ADD COLUMN IF NOT EXISTS meta_description text;
ALTER TABLE help_articles ADD COLUMN IF NOT EXISTS keywords text;
ALTER TABLE help_articles ADD COLUMN IF NOT EXISTS og_title text;
ALTER TABLE help_articles ADD COLUMN IF NOT EXISTS og_description text;
ALTER TABLE help_articles ADD COLUMN IF NOT EXISTS og_image text;