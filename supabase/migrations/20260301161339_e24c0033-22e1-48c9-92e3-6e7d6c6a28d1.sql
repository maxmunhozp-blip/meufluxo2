
-- Add display_month to sections
ALTER TABLE public.sections ADD COLUMN display_month date;

-- Backfill: use created_at
UPDATE public.sections SET display_month = date_trunc('month', created_at)::date;

-- Make NOT NULL with default
ALTER TABLE public.sections ALTER COLUMN display_month SET NOT NULL;
ALTER TABLE public.sections ALTER COLUMN display_month SET DEFAULT (date_trunc('month', CURRENT_DATE))::date;

-- Index
CREATE INDEX idx_sections_display_month ON public.sections (display_month);
