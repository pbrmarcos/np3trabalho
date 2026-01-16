-- Create portfolio_items table
CREATE TABLE public.portfolio_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  image_url TEXT NOT NULL,
  website_url TEXT,
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.portfolio_items ENABLE ROW LEVEL SECURITY;

-- Anyone can view active portfolio items
CREATE POLICY "Anyone can view active portfolio items"
ON public.portfolio_items
FOR SELECT
USING (is_active = true);

-- Admins can view all portfolio items
CREATE POLICY "Admins can view all portfolio items"
ON public.portfolio_items
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Admins can manage portfolio items
CREATE POLICY "Admins can manage portfolio items"
ON public.portfolio_items
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_portfolio_items_updated_at
BEFORE UPDATE ON public.portfolio_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for portfolio screenshots
INSERT INTO storage.buckets (id, name, public) VALUES ('portfolio-screenshots', 'portfolio-screenshots', true);

-- Storage policies
CREATE POLICY "Portfolio screenshots are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'portfolio-screenshots');

CREATE POLICY "Admins can upload portfolio screenshots"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'portfolio-screenshots' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update portfolio screenshots"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'portfolio-screenshots' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete portfolio screenshots"
ON storage.objects
FOR DELETE
USING (bucket_id = 'portfolio-screenshots' AND has_role(auth.uid(), 'admin'));