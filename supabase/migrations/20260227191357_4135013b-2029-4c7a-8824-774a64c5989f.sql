-- Migrate existing data: create workspaces for existing users and assign workspace_id
-- For each user that has projects but no workspace, create a personal workspace

DO $$
DECLARE
  _user RECORD;
  _ws_id uuid;
BEGIN
  -- Find users who have projects but no workspace membership
  FOR _user IN
    SELECT DISTINCT p.id as profile_id
    FROM profiles p
    WHERE NOT EXISTS (
      SELECT 1 FROM workspace_members wm WHERE wm.user_id = p.id
    )
  LOOP
    -- Create workspace
    INSERT INTO workspaces (name, owner_id)
    VALUES ('Meu Workspace', _user.profile_id)
    RETURNING id INTO _ws_id;

    -- Add as owner
    INSERT INTO workspace_members (workspace_id, user_id, role, accepted_at)
    VALUES (_ws_id, _user.profile_id, 'owner', now());

    -- Update all their projects
    UPDATE projects SET workspace_id = _ws_id
    WHERE workspace_id IS NULL
    AND id IN (
      SELECT DISTINCT t.project_id FROM tasks t WHERE t.created_by = _user.profile_id
      UNION
      SELECT p2.id FROM projects p2 WHERE NOT EXISTS (SELECT 1 FROM tasks t2 WHERE t2.project_id = p2.id)
    );

    -- Update sections for those projects
    UPDATE sections SET workspace_id = _ws_id
    WHERE workspace_id IS NULL
    AND project_id IN (SELECT id FROM projects WHERE workspace_id = _ws_id);

    -- Update tasks for those projects
    UPDATE tasks SET workspace_id = _ws_id
    WHERE workspace_id IS NULL
    AND project_id IN (SELECT id FROM projects WHERE workspace_id = _ws_id);
  END LOOP;

  -- Also handle: users who already have a workspace but have orphan projects/sections/tasks
  FOR _user IN
    SELECT DISTINCT wm.user_id, wm.workspace_id
    FROM workspace_members wm
    WHERE wm.role = 'owner'
  LOOP
    -- Assign orphan projects (no workspace_id) to the user's workspace
    UPDATE projects SET workspace_id = _user.workspace_id
    WHERE workspace_id IS NULL
    AND id IN (SELECT DISTINCT t.project_id FROM tasks t WHERE t.created_by = _user.user_id);

    UPDATE sections SET workspace_id = _user.workspace_id
    WHERE workspace_id IS NULL
    AND project_id IN (SELECT id FROM projects WHERE workspace_id = _user.workspace_id);

    UPDATE tasks SET workspace_id = _user.workspace_id
    WHERE workspace_id IS NULL
    AND project_id IN (SELECT id FROM projects WHERE workspace_id = _user.workspace_id);
  END LOOP;
END;
$$;
