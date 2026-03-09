
DROP POLICY IF EXISTS "Users can manage their own time entries" ON public.time_entries;

CREATE POLICY "Time entries readable by workspace members"
  ON public.time_entries FOR SELECT
  USING (is_workspace_member(auth.uid(), workspace_id) OR is_super_admin(auth.uid()));

CREATE POLICY "Time entries insertable by owner"
  ON public.time_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Time entries deletable by owner"
  ON public.time_entries FOR DELETE
  USING (auth.uid() = user_id);
