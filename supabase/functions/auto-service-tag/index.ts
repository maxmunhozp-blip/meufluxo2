import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { taskName, sectionName, serviceTags } = await req.json();

    if (!taskName || !serviceTags || serviceTags.length === 0) {
      return new Response(
        JSON.stringify({ serviceTagId: null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ serviceTagId: null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tagList = serviceTags
      .map((t: { id: string; name: string }) => `- ID: "${t.id}" → "${t.name}"`)
      .join("\n");

    const prompt = `Você é um classificador de tarefas para uma agência de marketing digital.

Tipos de trabalho disponíveis:
${tagList}

Tarefa: "${taskName}"
${sectionName ? `Seção: "${sectionName}"` : ""}

Com base no nome da tarefa e na seção, qual é o tipo de trabalho mais adequado?
Responda APENAS com o ID do tipo de trabalho, sem aspas, sem explicação.
Se nenhum tipo se encaixar, responda "null".`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [
            {
              role: "system",
              content:
                "You are a task classifier. Respond only with the service tag ID or null. No explanation.",
            },
            { role: "user", content: prompt },
          ],
          temperature: 0,
          max_tokens: 100,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429 || response.status === 402) {
        console.warn("AI rate limited or payment required, skipping auto-tag");
        return new Response(
          JSON.stringify({ serviceTagId: null }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.error("AI gateway error:", response.status);
      return new Response(
        JSON.stringify({ serviceTagId: null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const rawAnswer = (
      data.choices?.[0]?.message?.content || ""
    ).trim().replace(/"/g, "");

    // Validate that the answer is a known tag ID
    const validIds = new Set(
      serviceTags.map((t: { id: string }) => t.id)
    );
    const serviceTagId = validIds.has(rawAnswer) ? rawAnswer : null;

    console.log(
      `Auto-tag: "${taskName}" in "${sectionName}" → ${serviceTagId || "none"}`
    );

    return new Response(
      JSON.stringify({ serviceTagId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("auto-service-tag error:", e);
    return new Response(
      JSON.stringify({ serviceTagId: null }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
