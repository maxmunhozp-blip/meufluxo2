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

    // Fetch all tasks with recurrence rules (only parent tasks, not subtasks)
    const { data: recurringTasks, error: fetchError } = await supabase
      .from("tasks")
      .select("*")
      .not("recurrence_type", "is", null)
      .is("parent_task_id", null);

    if (fetchError) {
      console.error("Error fetching recurring tasks:", fetchError);
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!recurringTasks || recurringTasks.length === 0) {
      return new Response(
        JSON.stringify({ message: "No recurring tasks found", created: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const today = new Date();
    today.setHours(12, 0, 0, 0);

    // Generate instances for the next 14 days
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 14);

    const fmt = (d: Date) => {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    };

    const addDays = (d: Date, n: number) => {
      const r = new Date(d);
      r.setDate(r.getDate() + n);
      return r;
    };

    let created = 0;

    for (const task of recurringTasks) {
      const type = task.recurrence_type;
      const config = task.recurrence_config || {};
      // Use scheduled_date or due_date as base
      const baseDateStr = task.scheduled_date || task.due_date;

      if (!baseDateStr) continue;

      const baseDate = new Date(baseDateStr + "T12:00:00");
      const datesToCreate: string[] = [];

      // Calculate all future dates within the next 14 days
      if (type === "daily") {
        for (let i = 0; i <= 14; i++) {
          const candidate = addDays(today, i);
          if (candidate > baseDate && candidate <= endDate) {
            const ds = fmt(candidate);
            if (!datesToCreate.includes(ds)) datesToCreate.push(ds);
          }
        }
      } else if (type === "weekly") {
        const weekDays: number[] = config.weekDays || [baseDate.getDay()];
        for (let i = 0; i <= 14; i++) {
          const candidate = addDays(today, i);
          if (weekDays.includes(candidate.getDay()) && candidate > baseDate) {
            datesToCreate.push(fmt(candidate));
          }
        }
      } else if (type === "monthly_day") {
        const day = config.monthDay || baseDate.getDate();
        for (let i = 0; i <= 14; i++) {
          const candidate = addDays(today, i);
          if (candidate.getDate() === day && candidate > baseDate) {
            datesToCreate.push(fmt(candidate));
          }
        }
      } else if (type === "monthly_weekday") {
        const week = config.monthWeekday?.week || 1;
        const dayOfWeek = config.monthWeekday?.day || 1;
        for (let i = 0; i <= 14; i++) {
          const candidate = addDays(today, i);
          if (candidate.getDay() === dayOfWeek && candidate > baseDate) {
            // Check if it's the Nth occurrence in the month
            const dayOfMonth = candidate.getDate();
            const weekNumber = Math.ceil(dayOfMonth / 7);
            if (weekNumber === week) {
              datesToCreate.push(fmt(candidate));
            }
          }
        }
      } else if (type === "custom") {
        const interval = config.interval || 1;
        const unit = config.intervalUnit || "days";
        let candidate = new Date(baseDate);
        for (let attempts = 0; attempts < 200; attempts++) {
          if (unit === "days") candidate = addDays(candidate, interval);
          else if (unit === "weeks") candidate = addDays(candidate, interval * 7);
          else {
            candidate = new Date(candidate);
            candidate.setMonth(candidate.getMonth() + interval);
          }
          if (candidate > endDate) break;
          if (candidate >= today) {
            datesToCreate.push(fmt(candidate));
          }
        }
      }

      // Check for existing instances and create missing ones
      for (const dateStr of datesToCreate) {
        // Anti-duplicate: check by title + project + scheduled_date
        const { data: existing } = await supabase
          .from("tasks")
          .select("id")
          .eq("title", task.title)
          .eq("project_id", task.project_id)
          .eq("scheduled_date", dateStr)
          .limit(1);

        if (existing && existing.length > 0) continue;

        // Create the new instance with scheduled_date
        const { error: insertError } = await supabase.from("tasks").insert({
          title: task.title,
          project_id: task.project_id,
          section_id: task.section_id,
          assignee: task.assignee,
          priority: task.priority,
          description: task.description,
          scheduled_date: dateStr,
          due_date: null,
          day_period: task.day_period || "morning",
          status: "pending",
          created_by: task.created_by,
          workspace_id: task.workspace_id,
          service_tag_id: task.service_tag_id,
          recurrence_type: task.recurrence_type,
          recurrence_config: task.recurrence_config,
        });

        if (insertError) {
          console.error(`Error creating recurring instance for ${dateStr}:`, insertError);
        } else {
          created++;
        }
      }
    }

    console.log(`Generated ${created} recurring task instances`);

    return new Response(
      JSON.stringify({
        message: `Generated ${created} recurring task instances`,
        created,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Recurrence generation error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
