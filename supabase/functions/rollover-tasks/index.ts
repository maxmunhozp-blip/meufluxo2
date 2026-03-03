import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    // Find overdue tasks: (due_date < today OR scheduled_date < today) AND status != 'done'
    const { data: overdueTasks, error: fetchError } = await supabase
      .from("tasks")
      .select("id, due_date, scheduled_date, original_due_date, rollover_count")
      .lt("due_date", todayStr)
      .neq("status", "done")
      .is("parent_task_id", null);

    // Also find overdue by scheduled_date
    const { data: overdueScheduled, error: fetchError2 } = await supabase
      .from("tasks")
      .select("id, due_date, scheduled_date, original_due_date, rollover_count")
      .lt("scheduled_date", todayStr)
      .neq("status", "done")
      .is("parent_task_id", null);

    if (fetchError || fetchError2) {
      console.error("Error fetching overdue tasks:", fetchError || fetchError2);
      return new Response(JSON.stringify({ error: (fetchError || fetchError2)?.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Merge and deduplicate
    const allOverdue = [...(overdueTasks || []), ...(overdueScheduled || [])];
    const seen = new Set<string>();
    const uniqueOverdue = allOverdue.filter(t => {
      if (seen.has(t.id)) return false;
      seen.add(t.id);
      return true;
    });

    if (!uniqueOverdue || uniqueOverdue.length === 0) {
      return new Response(
        JSON.stringify({ message: "No overdue tasks to rollover", count: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let rolledOver = 0;

    for (const task of uniqueOverdue) {
      const updates: Record<string, unknown> = {
        rollover_count: (task.rollover_count || 0) + 1,
        day_period: "morning",
      };

      // Update scheduled_date if it was the overdue field
      if (task.scheduled_date && task.scheduled_date < todayStr) {
        updates.scheduled_date = todayStr;
        if (!task.original_due_date) {
          updates.original_due_date = task.scheduled_date;
        }
      }
      // Update due_date if it was the overdue field (and no scheduled_date)
      if (task.due_date && task.due_date < todayStr && !task.scheduled_date) {
        updates.due_date = todayStr;
        if (!task.original_due_date) {
          updates.original_due_date = task.due_date;
        }
      }

      const { error: updateError } = await supabase
        .from("tasks")
        .update(updates)
        .eq("id", task.id);

      if (updateError) {
        console.error(`Error rolling over task ${task.id}:`, updateError);
      } else {
        rolledOver++;
      }
    }

    // Global reset: todas tasks pendentes voltam para morning
    const { error: resetError } = await supabase
      .from("tasks")
      .update({ day_period: "morning", manually_moved: false })
      .neq("status", "done")
      .or("day_period.neq.morning,manually_moved.eq.true");

    if (resetError) {
      console.error("Error resetting day_period:", resetError);
    }

    console.log(`Rolled over ${rolledOver} tasks to ${todayStr}`);

    return new Response(
      JSON.stringify({
        message: `Rolled over ${rolledOver} tasks`,
        count: rolledOver,
        date: todayStr,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Rollover error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
