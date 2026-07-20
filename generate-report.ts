import { createClient } from 'npm:@insforge/sdk';
import { jsPDF } from 'https://esm.sh/jspdf@2.5.1';
import autoTable from 'https://esm.sh/jspdf-autotable@3.8.2';

export default async function(req: Request): Promise<Response> {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Expose-Headers': 'Content-Disposition'
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    let type = url.searchParams.get('type') || 'health';

    // Parse body if POST method is used
    if (req.method === 'POST') {
      try {
        const body = await req.json();
        if (body.type) type = body.type;
      } catch (e) {
        // Fallback to URL query params
      }
    }

    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    const isMock = !token || token === 'mock-jwt-token' || token === 'null' || token === 'undefined';
    const client = createClient({
      baseUrl: Deno.env.get('INSFORGE_BASE_URL') || '',
      anonKey: Deno.env.get('ANON_KEY') || Deno.env.get('INSFORGE_ANON_KEY') || '',
      accessToken: isMock ? undefined : token
    });

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    // Page Header Styling
    doc.setFillColor(15, 23, 42); // slate-900 background for header
    doc.rect(0, 0, 210, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('INDIAN RAILWAYS WORKSHOP', 15, 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Inventory & Predictive Maintenance AI System', 15, 18);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 15, 24);

    // Dynamic Title
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    
    let tableHeaders: string[] = [];
    let tableRows: any[][] = [];
    let reportTitle = '';

    if (type === 'maintenance') {
      reportTitle = 'MAINTENANCE SCHEDULES REPORT';
      const { data, error } = await client.database
        .from('maintenance')
        .select('*')
        .order('maintenance_date', { ascending: false });

      tableHeaders = ['Maintenance ID', 'Machine ID', 'Date', 'Technician', 'Remarks', 'Status'];
      if (data) {
        tableRows = data.map((r: any) => [
          r.maintenance_id,
          r.machine_id,
          r.maintenance_date,
          r.technician,
          r.remarks || 'N/A',
          r.status
        ]);
      }
    } else if (type === 'inventory') {
      reportTitle = 'SPARE PARTS INVENTORY STATUS REPORT';
      const { data, error } = await client.database
        .from('spare_parts')
        .select('*')
        .order('part_id', { ascending: true });

      tableHeaders = ['Part ID', 'Part Number', 'Part Name', 'Category', 'Qty Available', 'Min Stock', 'Supplier', 'Location'];
      if (data) {
        tableRows = data.map((r: any) => [
          r.part_id,
          r.part_number,
          r.part_name,
          r.category,
          r.quantity,
          r.min_stock,
          r.supplier,
          r.location
        ]);
      }
    } else if (type === 'ai') {
      reportTitle = 'AI MACHINE FAILURE PROGNOSTICS REPORT';
      const { data, error } = await client.database
        .from('ai_prediction')
        .select('*')
        .order('prediction_date', { ascending: false });

      tableHeaders = ['ID', 'Machine ID', 'Failure Prob', 'Risk Level', 'Prediction Date', 'Recommendations'];
      if (data) {
        tableRows = data.map((r: any) => [
          r.prediction_id,
          r.machine_id,
          `${r.failure_probability}%`,
          r.risk_level,
          new Date(r.prediction_date).toLocaleDateString(),
          r.recommendations || 'N/A'
        ]);
      }
    } else if (type === 'usage') {
      reportTitle = 'MACHINE RUNNING HOURS & TELEMETRY REPORT';
      const { data: machines } = await client.database
        .from('machine')
        .select('*')
        .order('machine_id', { ascending: true });

      tableHeaders = ['Machine ID', 'Machine Name', 'Department', 'Running Hours', 'Last Service', 'Status'];
      if (machines) {
        tableRows = machines.map((r: any) => [
          r.machine_id,
          r.machine_name,
          r.department,
          `${r.running_hours} hrs`,
          r.last_service || 'N/A',
          r.status
        ]);
      }
    } else {
      // Default: health
      reportTitle = 'MACHINE HEALTH & STATUS REPORT';
      const { data, error } = await client.database
        .from('machine')
        .select('*')
        .order('machine_id', { ascending: true });

      tableHeaders = ['Machine ID', 'Machine Name', 'Department', 'Installation Date', 'Running Hours', 'Status'];
      if (data) {
        tableRows = data.map((r: any) => [
          r.machine_id,
          r.machine_name,
          r.department,
          r.installation_date,
          `${r.running_hours} hrs`,
          r.status
        ]);
      }
    }

    doc.text(reportTitle, 15, 42);

    autoTable(doc, {
      startY: 48,
      head: [tableHeaders],
      body: tableRows,
      theme: 'striped',
      headStyles: { fillColor: [30, 41, 59] }, // slate-800
      alternateRowStyles: { fillColor: [248, 250, 252] }, // slate-50
      styles: { fontSize: 9, cellPadding: 3 }
    });

    // Add page numbers
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(8);
      doc.text(`Page ${i} of ${totalPages}`, 180, 287);
    }

    const pdfBase64 = doc.output('base64');

    return new Response(JSON.stringify({ pdf: pdfBase64 }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}
