-- Add day_period column to tasks for morning/afternoon/evening scheduling
ALTER TABLE public.tasks 
ADD COLUMN day_period text DEFAULT 'morning' 
CHECK (day_period IN ('morning', 'afternoon', 'evening'));