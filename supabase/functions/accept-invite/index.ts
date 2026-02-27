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

    const { invite_code } = await req.json();
    if (!invite_code) {
      return new Response(JSON.stringify({ error: 'Código de convite obrigatório' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Find invite
    const { data: invite, error: inviteError } = await adminClient
      .from('workspace_invites')
      .select('*')
      .eq('invite_code', invite_code)
      .single();

    if (inviteError || !invite) {
      return new Response(JSON.stringify({ error: 'Convite não encontrado ou inválido.' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check expiration
    if (new Date(invite.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: 'Este convite expirou.' }), {
        status: 410,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if already used
    if (invite.used_by) {
      return new Response(JSON.stringify({ error: 'Este convite já foi utilizado.' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user is already a member
    const { data: existing } = await adminClient
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', invite.workspace_id)
      .eq('user_id', user.id)
      .single();

    if (existing) {
      return new Response(JSON.stringify({ error: 'Você já é membro deste workspace.', code: 'ALREADY_MEMBER' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Add as workspace member
    const { error: insertError } = await adminClient
      .from('workspace_members')
      .insert({
        workspace_id: invite.workspace_id,
        user_id: user.id,
        role: 'member',
        accepted_at: new Date().toISOString(),
      });

    if (insertError) throw insertError;

    // Mark invite as used
    await adminClient
      .from('workspace_invites')
      .update({ used_by: user.id })
      .eq('id', invite.id);

    // Get workspace name
    const { data: ws } = await adminClient
      .from('workspaces')
      .select('name')
      .eq('id', invite.workspace_id)
      .single();

    return new Response(JSON.stringify({
      success: true,
      workspace_id: invite.workspace_id,
      workspace_name: ws?.name || 'Workspace',
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Error in accept-invite:', err);
    return new Response(JSON.stringify({ error: 'Erro interno' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
