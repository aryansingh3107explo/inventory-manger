import { createClient } from 'npm:@insforge/sdk';
import OpenAI from 'npm:openai';

export default async function(req: Request): Promise<Response> {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key, apikey'
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    const isMock = !token || token === 'mock-jwt-token' || token === 'null' || token === 'undefined';
    const client = createClient({
      baseUrl: Deno.env.get('INSFORGE_BASE_URL') || '',
      anonKey: Deno.env.get('ANON_KEY') || Deno.env.get('INSFORGE_ANON_KEY') || '',
      accessToken: isMock ? undefined : token
    });

    const body = await req.json();
    const { messages } = body;

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'Messages array is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 1. Fetch real-time workshop context from the database
    const [machinesRes, partsRes, maintRes] = await Promise.all([
      client.database.from('machine').select('*'),
      client.database.from('spare_parts').select('*'),
      client.database.from('maintenance').select('*').order('maintenance_date', { ascending: false }).limit(10)
    ]);

    if (machinesRes.error) throw new Error(`Machine query error: ${machinesRes.error.message}`);
    if (partsRes.error) throw new Error(`Parts query error: ${partsRes.error.message}`);
    if (maintRes.error) throw new Error(`Maintenance query error: ${maintRes.error.message}`);

    const machines = machinesRes.data || [];
    const parts = partsRes.data || [];
    const maintenance = maintRes.data || [];

    // 2. Format database context for the AI model
    const contextPrompt = `
You are the "IR-Works AI Assistant", a smart mechanical diagnostic co-pilot for the Indian Railways Workshop.
Your goal is to assist shop-floor technicians and engineers in diagnosing locomotive issues, managing spare parts, and interpreting maintenance schedules.

Here is the current real-time state of the workshop database:
---
MACHINERY REGISTRY:
${machines.map(m => `- ${m.machine_name} (ID: ${m.machine_id}) in ${m.department}. Status: ${m.status}, Run Time: ${m.running_hours} hrs, Last Service: ${m.last_service || 'Never'}`).join('\n')}

SPARE PARTS CATALOG (INVENTORY):
${parts.map(p => `- ${p.part_name} (ID: ${p.part_id}, SKU: ${p.part_number}) | Category: ${p.category} | Qty: ${p.quantity} units (Min Safety Stock: ${p.min_stock}) | Location: ${p.location}`).join('\n')}

RECENT MAINTENANCE LOGS:
${maintenance.map(l => `- Date: ${l.maintenance_date} | Machine: ${l.machine_id} | Technician: ${l.technician} | Status: ${l.status} | Details: ${l.remarks}`).join('\n')}
---

INSTRUCTIONS:
1. Provide diagnostic steps using Indian Railways terminology where relevant (e.g., LHB Coach Wheelsets, WAP-7 Traction Motors, WDM-3D Diesel Engines, Brake Rigging, Air-Suspension System).
2. Answer questions accurately based on the real-time database context provided above.
3. Be professional, clear, and highly focused on safety, operational uptime, and predictive failure diagnostics.
4. Keep responses concise and highly actionable for shop-floor engineers.
`;

    // 3. Initialize OpenAI client pointing to OpenRouter
    const openrouterKey = Deno.env.get('OPENROUTER_API_KEY') || Deno.env.get('API_KEY') || '';
    const openai = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: openrouterKey,
      defaultHeaders: {
        'HTTP-Referer': 'https://railworks-ai.insforge.app',
        'X-Title': 'RailWorks AI Workshop Assistant'
      }
    });

    // 4. Request completion
    const completion = await openai.chat.completions.create({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: contextPrompt },
        ...messages
      ]
    });

    const reply = completion.choices[0]?.message?.content || "I'm sorry, I couldn't formulate a response. Please check the sensor parameters.";

    return new Response(JSON.stringify({ reply }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}
