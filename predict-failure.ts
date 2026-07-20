import { createClient } from 'npm:@insforge/sdk';

export default async function(req: Request): Promise<Response> {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { machine_id, temperature, vibration, hours, breakdownHistoryOverride } = body;

    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    const isMock = !token || token === 'mock-jwt-token' || token === 'null' || token === 'undefined';
    const client = createClient({
      baseUrl: Deno.env.get('INSFORGE_BASE_URL') || '',
      anonKey: Deno.env.get('ANON_KEY') || Deno.env.get('INSFORGE_ANON_KEY') || '',
      accessToken: isMock ? undefined : token
    });

    // 1. Fetch machine details
    const { data: machine, error: mError } = await client.database
      .from('machine')
      .select('*')
      .eq('machine_id', machine_id)
      .single();

    if (mError || !machine) {
      console.error('Database fetch error in predict-failure:', mError);
      return new Response(JSON.stringify({ error: mError?.message || 'Machine not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 2. Count past breakdowns
    let breakdownHistory = breakdownHistoryOverride;
    if (breakdownHistory === undefined) {
      const { count, error: countError } = await client.database
        .from('maintenance')
        .select('*', { count: 'exact', head: true })
        .eq('machine_id', machine_id)
        .like('remarks', '%breakdown%');
      breakdownHistory = count || 0;
    }
    
    // Calculate machine age
    const installDate = new Date(machine.installation_date);
    const age = (new Date().getTime() - installDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);

    const daysSinceService = machine.last_service 
      ? (new Date().getTime() - new Date(machine.last_service).getTime()) / (1000 * 60 * 60 * 24)
      : 30;

    const runningHours = hours !== undefined ? hours : machine.running_hours;

    // AI Prediction Math
    const score = (
      0.1 * (age / 15) +
      0.15 * (runningHours / 20000) +
      0.35 * ((temperature - 50) / 60) +
      0.3 * ((vibration - 0.5) / 11.5) +
      0.05 * (daysSinceService / 365) +
      0.05 * (breakdownHistory / 10)
    );

    const probPercentage = Math.min(100, Math.max(0, Math.round(score * 100 * 10) / 10));

    let riskLevel = 'Low';
    if (probPercentage >= 75) {
      riskLevel = 'High';
    } else if (probPercentage >= 35) {
      riskLevel = 'Medium';
    }

    const recommendations = [];
    if (temperature > 80) {
      recommendations.push("Lubricate Gearbox");
      recommendations.push("Inspect Motor cooling fan");
    }
    if (vibration > 5.0) {
      recommendations.push("Replace Bearing");
      recommendations.push("Verify Shaft alignment");
    }
    if (runningHours > 5000) {
      recommendations.push("Inspect electrical terminals");
    }
    if (daysSinceService > 180) {
      recommendations.push("Schedule full preventive service");
    }
    if (riskLevel === 'High') {
      recommendations.push("Halt operation for safety audit");
    }
    if (recommendations.length === 0) {
      recommendations.push("Routine clean and lubricate");
      recommendations.push("Check bolt tightness");
    }

    const predictionResult = {
      failure_probability: probPercentage,
      risk_level: riskLevel,
      recommendations: recommendations.join(', ')
    };

    // If logging telemetry was requested, we save it and update hours
    if (body.logTelemetry) {
      // Create telemetry entry
      await client.database.from('telemetry_log').insert([{
        machine_id,
        temperature,
        vibration
      }]);

      // Update machine running hours and status
      await client.database.from('machine').update({
        running_hours: runningHours + 2.0,
        status: riskLevel === 'High' ? 'Down' : machine.status
      }).eq('machine_id', machine_id);

      // Create AI Prediction log
      await client.database.from('ai_prediction').insert([{
        machine_id,
        failure_probability: probPercentage,
        risk_level: riskLevel,
        recommendations: predictionResult.recommendations
      }]);
    }

    return new Response(JSON.stringify({ prediction: predictionResult }), {
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
