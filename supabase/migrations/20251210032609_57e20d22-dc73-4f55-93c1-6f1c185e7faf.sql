-- Create help_article_feedback table
CREATE TABLE public.help_article_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id UUID NOT NULL REFERENCES public.help_articles(id) ON DELETE CASCADE,
  is_helpful BOOLEAN NOT NULL,
  user_id UUID,
  session_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.help_article_feedback ENABLE ROW LEVEL SECURITY;

-- Anyone can insert feedback (anonymous allowed)
CREATE POLICY "Anyone can submit feedback"
ON public.help_article_feedback
FOR INSERT
WITH CHECK (true);

-- Admins can view all feedback
CREATE POLICY "Admins can view feedback"
ON public.help_article_feedback
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index
CREATE INDEX idx_help_article_feedback_article ON public.help_article_feedback(article_id);