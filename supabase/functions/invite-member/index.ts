import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autenticado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Client with user's token for auth check
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Não autenticado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { email, workspace_id } = await req.json();
    if (!email || !workspace_id) {
      return new Response(JSON.stringify({ error: 'Email e workspace_id são obrigatórios' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Admin client for privileged operations
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Check if caller is owner/admin of workspace
    const { data: callerMembership } = await adminClient
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspace_id)
      .eq('user_id', user.id)
      .single();

    if (!callerMembership || !['owner', 'admin'].includes(callerMembership.role)) {
      return new Response(JSON.stringify({ error: 'Sem permissão para convidar' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Look up user by email in auth.users
    const { data: { users }, error: listError } = await adminClient.auth.admin.listUsers();
    if (listError) throw listError;

    const targetUser = users.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());

    if (!targetUser) {
      return new Response(JSON.stringify({ 
        error: 'Usuário não encontrado. O membro precisa criar uma conta primeiro.',
        code: 'USER_NOT_FOUND',
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if already a member
    const { data: existing } = await adminClient
      .from('workspace_members')
      .select('id, accepted_at')
      .eq('workspace_id', workspace_id)
      .eq('user_id', targetUser.id)
      .single();

    if (existing) {
      return new Response(JSON.stringify({ 
        error: existing.accepted_at ? 'Este usuário já é membro do workspace.' : 'Convite já enviado para este usuário.',
        code: 'ALREADY_MEMBER',
      }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Add as workspace member with accepted_at = null (pending invite)
    const { data: membership, error: insertError } = await adminClient
      .from('workspace_members')
      .insert({
        workspace_id,
        user_id: targetUser.id,
        role: 'member',
        accepted_at: null,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Get invitee profile
    const { data: profile } = await adminClient
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('id', targetUser.id)
      .single();

    return new Response(JSON.stringify({
      success: true,
      member: {
        id: membership.id,
        userId: targetUser.id,
        fullName: profile?.full_name || targetUser.email,
        avatarUrl: profile?.avatar_url || null,
        role: 'member',
        acceptedAt: null,
      },
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Error in invite-member:', err);
    return new Response(JSON.stringify({ error: 'Erro interno' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
