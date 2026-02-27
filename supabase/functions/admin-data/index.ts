import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Verify caller is super_admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await anonClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Check super_admin role
    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "super_admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    if (action === "dashboard") {
      // Get all users from auth
      const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers({ perPage: 10000 });
      const users = authUsers?.users || [];
      const totalUsers = users.length;

      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const activeUsers = users.filter(u => u.last_sign_in_at && u.last_sign_in_at >= sevenDaysAgo).length;

      // Workspaces
      const { count: totalWorkspaces } = await supabaseAdmin.from("workspaces").select("*", { count: "exact", head: true });
      const { count: freeCount } = await supabaseAdmin.from("workspaces").select("*", { count: "exact", head: true }).eq("plan", "free");
      const { count: proCount } = await supabaseAdmin.from("workspaces").select("*", { count: "exact", head: true }).eq("plan", "pro");

      // Signups per week (last 8 weeks)
      const weeks: { label: string; count: number }[] = [];
      for (let i = 7; i >= 0; i--) {
        const start = new Date();
        start.setDate(start.getDate() - (i + 1) * 7);
        const end = new Date();
        end.setDate(end.getDate() - i * 7);
        const count = users.filter(u => {
          const d = new Date(u.created_at);
          return d >= start && d < end;
        }).length;
        weeks.push({
          label: `${start.getDate()}/${start.getMonth() + 1}`,
          count,
        });
      }

      return new Response(JSON.stringify({
        totalUsers,
        activeUsers,
        totalWorkspaces: totalWorkspaces || 0,
        freeCount: freeCount || 0,
        proCount: proCount || 0,
        signupsByWeek: weeks,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "users") {
      const page = parseInt(url.searchParams.get("page") || "1");
      const search = url.searchParams.get("search") || "";
      const planFilter = url.searchParams.get("plan") || "";
      const perPage = 20;

      const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers({ perPage: 10000 });
      let users = authUsers?.users || [];

      // Get all profiles
      const { data: profiles } = await supabaseAdmin.from("profiles").select("*");
      const profileMap = new Map((profiles || []).map(p => [p.id, p]));

      // Get all roles
      const { data: roles } = await supabaseAdmin.from("user_roles").select("*");
      const roleMap = new Map<string, string[]>();
      (roles || []).forEach(r => {
        if (!roleMap.has(r.user_id)) roleMap.set(r.user_id, []);
        roleMap.get(r.user_id)!.push(r.role);
      });

      // Get workspace memberships with workspace plan
      const { data: wMembers } = await supabaseAdmin.from("workspace_members").select("user_id, workspace_id, workspaces(plan)");
      const userPlanMap = new Map<string, string>();
      (wMembers || []).forEach((wm: any) => {
        const plan = wm.workspaces?.plan || "free";
        if (plan === "pro" || !userPlanMap.has(wm.user_id)) {
          userPlanMap.set(wm.user_id, plan);
        }
      });

      // Map users
      let mapped = users.map(u => {
        const profile = profileMap.get(u.id);
        return {
          id: u.id,
          email: u.email || "",
          fullName: profile?.full_name || "",
          avatarUrl: profile?.avatar_url || null,
          plan: userPlanMap.get(u.id) || "free",
          roles: roleMap.get(u.id) || ["member"],
          createdAt: u.created_at,
          lastSignIn: u.last_sign_in_at || null,
          banned: u.banned_until ? true : false,
        };
      });

      // Search filter
      if (search) {
        const lower = search.toLowerCase();
        mapped = mapped.filter(u =>
          u.fullName.toLowerCase().includes(lower) ||
          u.email.toLowerCase().includes(lower)
        );
      }

      // Plan filter
      if (planFilter && planFilter !== "all") {
        mapped = mapped.filter(u => u.plan === planFilter);
      }

      // Sort by createdAt desc
      mapped.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      const total = mapped.length;
      const paginated = mapped.slice((page - 1) * perPage, page * perPage);

      return new Response(JSON.stringify({ users: paginated, total, page, perPage }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "user-detail") {
      const userId = url.searchParams.get("userId");
      if (!userId) {
        return new Response(JSON.stringify({ error: "userId required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
      const { data: profile } = await supabaseAdmin.from("profiles").select("*").eq("id", userId).maybeSingle();
      const { data: roles } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId);
      const { data: wMembers } = await supabaseAdmin.from("workspace_members").select("workspace_id, role, workspaces(id, name, plan)").eq("user_id", userId);

      return new Response(JSON.stringify({
        id: userId,
        email: authUser?.user?.email || "",
        fullName: profile?.full_name || "",
        avatarUrl: profile?.avatar_url || null,
        roles: (roles || []).map(r => r.role),
        createdAt: authUser?.user?.created_at,
        lastSignIn: authUser?.user?.last_sign_in_at || null,
        banned: authUser?.user?.banned_until ? true : false,
        workspaces: (wMembers || []).map((wm: any) => ({
          id: wm.workspaces?.id,
          name: wm.workspaces?.name,
          plan: wm.workspaces?.plan,
          role: wm.role,
        })),
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "update-plan") {
      const { workspaceId, plan } = await req.json();
      if (!workspaceId || !["free", "pro"].includes(plan)) {
        return new Response(JSON.stringify({ error: "Invalid params" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const { error } = await supabaseAdmin.from("workspaces").update({ plan }).eq("id", workspaceId);
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "update-role") {
      const { userId: targetUserId, role, action: roleAction } = await req.json();
      if (!targetUserId || !role) {
        return new Response(JSON.stringify({ error: "Invalid params" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (roleAction === "add") {
        const { error } = await supabaseAdmin.from("user_roles").insert({ user_id: targetUserId, role });
        if (error && !error.message.includes("duplicate")) {
          return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      } else {
        const { error } = await supabaseAdmin.from("user_roles").delete().eq("user_id", targetUserId).eq("role", role);
        if (error) {
          return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      }
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "ban-user") {
      const { userId: targetUserId, ban } = await req.json();
      if (ban) {
        await supabaseAdmin.auth.admin.updateUserById(targetUserId, { ban_duration: "876000h" });
      } else {
        await supabaseAdmin.auth.admin.updateUserById(targetUserId, { ban_duration: "none" });
      }
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "workspaces") {
      const page = parseInt(url.searchParams.get("page") || "1");
      const search = url.searchParams.get("search") || "";
      const perPage = 20;

      const { data: workspaces } = await supabaseAdmin.from("workspaces").select("*");
      const { data: profiles } = await supabaseAdmin.from("profiles").select("id, full_name");
      const profileMap = new Map((profiles || []).map(p => [p.id, p.full_name]));

      // Count members per workspace
      const { data: members } = await supabaseAdmin.from("workspace_members").select("workspace_id");
      const memberCount = new Map<string, number>();
      (members || []).forEach(m => {
        memberCount.set(m.workspace_id, (memberCount.get(m.workspace_id) || 0) + 1);
      });

      // Count projects per workspace
      const { data: projects } = await supabaseAdmin.from("projects").select("workspace_id");
      const projectCount = new Map<string, number>();
      (projects || []).forEach(p => {
        if (p.workspace_id) projectCount.set(p.workspace_id, (projectCount.get(p.workspace_id) || 0) + 1);
      });

      // Count tasks per workspace
      const { data: tasks } = await supabaseAdmin.from("tasks").select("workspace_id");
      const taskCount = new Map<string, number>();
      (tasks || []).forEach(t => {
        if (t.workspace_id) taskCount.set(t.workspace_id, (taskCount.get(t.workspace_id) || 0) + 1);
      });

      let mapped = (workspaces || []).map(w => ({
        id: w.id,
        name: w.name,
        ownerName: profileMap.get(w.owner_id) || "—",
        plan: w.plan,
        members: memberCount.get(w.id) || 0,
        projects: projectCount.get(w.id) || 0,
        tasks: taskCount.get(w.id) || 0,
        createdAt: w.created_at,
      }));

      if (search) {
        const lower = search.toLowerCase();
        mapped = mapped.filter(w => w.name.toLowerCase().includes(lower) || w.ownerName.toLowerCase().includes(lower));
      }

      mapped.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      const total = mapped.length;
      const paginated = mapped.slice((page - 1) * perPage, page * perPage);

      return new Response(JSON.stringify({ workspaces: paginated, total, page, perPage }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
