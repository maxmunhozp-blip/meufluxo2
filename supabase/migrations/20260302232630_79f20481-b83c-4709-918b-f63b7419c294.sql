
-- Add section_type column to sections table
ALTER TABLE public.sections ADD COLUMN section_type text DEFAULT NULL;

-- Set existing "Entrada" sections to 'buffer' type
UPDATE public.sections SET section_type = 'buffer' WHERE name = 'Entrada';
