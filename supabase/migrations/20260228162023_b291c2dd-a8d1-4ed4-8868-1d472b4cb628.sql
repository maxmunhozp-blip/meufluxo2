CREATE OR REPLACE FUNCTION public.increment_section_positions(p_project_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE sections
  SET position = position + 1
  WHERE project_id = p_project_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;