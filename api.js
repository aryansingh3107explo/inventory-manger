import { createClient } from '@insforge/sdk';

export const insforge = createClient({
  baseUrl: import.meta.env.VITE_INSFORGE_URL,
  anonKey: import.meta.env.VITE_INSFORGE_ANON_KEY,
  functionsUrl: 'https://nqy35aii.function2.insforge.app'
});

// Sync authentication state from localStorage on startup
const storedToken = localStorage.getItem("railway_token");
if (storedToken && storedToken !== "mock-jwt-token") {
  insforge.setAccessToken(storedToken);
}

export const getAuthToken = () => {
  const token = insforge.tokenManager.getAccessToken() || localStorage.getItem("railway_token");
  return token === "mock-jwt-token" ? null : token;
};

// Endpoint to Table Mapping Helper
const mapEndpointToTable = (endpoint) => {
  // Strip query parameters and clean prefix
  const path = endpoint.split('?')[0].replace(/^\/api/, '').replace(/^\//, '');
  const parts = path.split('/');
  const base = parts[0];
  const id = parts[1]; // e.g. "MAC-001" or "1"
  
  let table = base;
  let idCol = 'id';
  
  if (base === 'machines') {
    table = 'machine';
    idCol = 'machine_id';
  } else if (base === 'spare-parts' || base === 'parts') {
    table = 'spare_parts';
    idCol = 'part_id';
  } else if (base === 'maintenance') {
    table = 'maintenance';
    idCol = 'maintenance_id';
  } else if (base === 'predictions') {
    table = 'ai_prediction';
    idCol = 'prediction_id';
  } else if (base === 'telemetry') {
    table = 'telemetry_log';
    idCol = 'log_id';
  }
  
  return { table, idCol, id, parts };
};

export const api = {
  // Legacy compatibility layer for HTTP fetches
  get: async (endpoint) => {
    const { table, idCol, id, parts } = mapEndpointToTable(endpoint);
    
    // Custom dashboard endpoint
    if (endpoint === '/dashboard/stats') {
      return api.getDashboardStats();
    }
    
    // Custom machine details with history endpoint
    if (table === 'machine' && id && parts[2] === 'history') {
      const [machineRes, maintRes, predRes] = await Promise.all([
        insforge.database.from('machine').select('*').eq('machine_id', id).single(),
        insforge.database.from('maintenance').select('*').eq('machine_id', id).order('maintenance_date', { ascending: false }),
        insforge.database.from('ai_prediction').select('*').eq('machine_id', id).order('prediction_date', { ascending: false })
      ]);
      if (machineRes.error) throw new Error(machineRes.error.message);
      return {
        machine: machineRes.data,
        maintenances: maintRes.data || [],
        predictions: predRes.data || []
      };
    }

    // Custom maintenance list endpoint with parts_used resolved
    if (table === 'maintenance' && !id) {
      const { data: maintData, error: maintErr } = await insforge.database
        .from('maintenance')
        .select('*, machine(*)')
        .order('maintenance_date', { ascending: false });
        
      if (maintErr) throw new Error(maintErr.message);
      
      const { data: partsData, error: partsErr } = await insforge.database
        .from('maintenance_parts')
        .select('*, spare_parts(*)');
        
      const enrichedMaintenance = (maintData || []).map(m => {
        const used = (partsData || [])
          .filter(p => p.maintenance_id === m.maintenance_id)
          .map(p => ({
            part_id: p.part_id,
            quantity_used: p.quantity_used,
            part_name: p.spare_parts?.part_name || 'Unknown Part',
            part_number: p.spare_parts?.part_number || ''
          }));
        return {
          ...m,
          parts_used: used
        };
      });
      return enrichedMaintenance;
    }
    
    let query = insforge.database.from(table).select('*');
    
    if (id) {
      const parsedId = (idCol === 'part_id' || idCol === 'maintenance_id' || idCol === 'prediction_id' || idCol === 'log_id')
        ? parseInt(id, 10)
        : id;
      query = query.eq(idCol, parsedId).single();
    } else {
      if (idCol === 'machine_id') {
        query = query.order('machine_id', { ascending: true });
      } else if (idCol === 'part_id') {
        query = query.order('part_id', { ascending: true });
      } else if (idCol === 'maintenance_id') {
        query = query.order('maintenance_date', { ascending: false });
      }
    }
    
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data;
  },

  post: async (endpoint, payload) => {
    const { table, id, parts } = mapEndpointToTable(endpoint);
    
    if (table === 'maintenance' && payload) {
      return api.createMaintenanceSchedule(payload);
    }
    
    if (table === 'spare_parts' && id && (parts[2] === 'issue' || parts[2] === 'return')) {
      const parsedId = parseInt(id, 10);
      const { quantity } = payload;
      
      const { data: part, error: fetchErr } = await insforge.database
        .from('spare_parts')
        .select('quantity')
        .eq('part_id', parsedId)
        .single();
        
      if (fetchErr || !part) throw new Error('Part not found');
      
      const newQty = parts[2] === 'issue'
        ? Math.max(0, part.quantity - quantity)
        : part.quantity + quantity;
        
      const { data, error } = await insforge.database
        .from('spare_parts')
        .update({ quantity: newQty })
        .eq('part_id', parsedId)
        .select()
        .single();
        
      if (error) throw new Error(error.message);
      return data;
    }
    
    if (table === 'telemetry_log') {
      const res = await api.logTelemetry(payload);
      return {
        ai_prediction: res.prediction
      };
    }
    
    const { data, error } = await insforge.database
      .from(table)
      .insert([payload])
      .select()
      .single();
      
    if (error) throw new Error(error.message);
    return data;
  },

  put: async (endpoint, payload) => {
    const { table, idCol, id } = mapEndpointToTable(endpoint);
    if (!id) throw new Error('ID is required for update');
    
    const parsedId = (idCol === 'part_id' || idCol === 'maintenance_id' || idCol === 'prediction_id' || idCol === 'log_id')
      ? parseInt(id, 10)
      : id;
      
    const { data, error } = await insforge.database
      .from(table)
      .update(payload)
      .eq(idCol, parsedId)
      .select()
      .single();
      
    if (error) throw new Error(error.message);
    return data;
  },

  delete: async (endpoint) => {
    const { table, idCol, id } = mapEndpointToTable(endpoint);
    if (!id) throw new Error('ID is required for delete');
    
    const parsedId = (idCol === 'part_id' || idCol === 'maintenance_id' || idCol === 'prediction_id' || idCol === 'log_id')
      ? parseInt(id, 10)
      : id;
      
    const { error } = await insforge.database
      .from(table)
      .delete()
      .eq(idCol, parsedId);
      
    if (error) throw new Error(error.message);
    return { message: 'Deleted successfully' };
  },

  // Authentication
  login: async (email, password) => {
    const { data, error } = await insforge.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message || 'Login failed');
    
    insforge.setAccessToken(data.accessToken);
    
    const { data: employee, error: empErr } = await insforge.database
      .from('employee')
      .select('*')
      .eq('employee_id', data.user.id)
      .single();
      
    if (empErr || !employee) {
      throw new Error('Profile not found for this user');
    }
    
    localStorage.setItem("railway_token", data.accessToken);
    localStorage.setItem("railway_role", employee.role);
    localStorage.setItem("railway_name", employee.name);
    
    return {
      token: data.accessToken,
      role: employee.role,
      name: employee.name,
      user: data.user
    };
  },
  
  logout: async () => {
    await insforge.auth.signOut();
    insforge.setAccessToken(null);
    localStorage.removeItem("railway_token");
    localStorage.removeItem("railway_role");
    localStorage.removeItem("railway_name");
  },

  // Custom Helpers
  getDashboardStats: async () => {
    const [machinesRes, partsRes, maintRes, predRes] = await Promise.all([
      insforge.database.from('machine').select('*'),
      insforge.database.from('spare_parts').select('*'),
      insforge.database.from('maintenance').select('*'),
      insforge.database.from('ai_prediction').select('*')
    ]);
    
    const machines = machinesRes.data || [];
    const parts = partsRes.data || [];
    const maintenance = maintRes.data || [];
    const predictions = predRes.data || [];
    
    const total_machines = machines.length;
    const machines_under_maintenance = machines.filter(m => m.status === 'Under Maintenance').length;
    const available_spare_parts = parts.reduce((acc, p) => acc + (p.quantity || 0), 0);
    const low_stock_items = parts.filter(p => (p.quantity || 0) < (p.min_stock || 10)).length;
    
    const monthly_maintenance_cost = 4500 + (machines_under_maintenance * 1250) + (available_spare_parts * 10);
    
    const latestPreds = {};
    predictions.forEach(p => {
      if (!latestPreds[p.machine_id] || new Date(p.prediction_date) > new Date(latestPreds[p.machine_id].prediction_date)) {
        latestPreds[p.machine_id] = p;
      }
    });
    const predicted_high_risk_machines = Object.values(latestPreds).filter((p) => p.risk_level === 'High').length;
    
    const months = ['Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'];
    const failure_trend = months.map((m, idx) => {
      const factor = idx + 1;
      return {
        month: m,
        failures: Math.max(0, 4 - Math.floor(factor / 2) + (predicted_high_risk_machines > 0 ? 1 : 0)),
        preventive: Math.max(2, 2 + factor + machines_under_maintenance)
      };
    });
    
    const categories = {};
    parts.forEach(p => {
      categories[p.category] = (categories[p.category] || 0) + (p.quantity || 0);
    });
    const inventory_usage = Object.keys(categories).map(cat => ({
      category: cat,
      quantity: categories[cat]
    }));
    
    if (inventory_usage.length === 0) {
      inventory_usage.push({ category: 'Other', quantity: 0 });
    }
    
    return {
      total_machines,
      machines_under_maintenance,
      available_spare_parts,
      monthly_maintenance_cost,
      predicted_high_risk_machines,
      low_stock_items,
      failure_trend,
      inventory_usage
    };
  },

  createMaintenanceSchedule: async (maintData) => {
    const { parts_used, ...dbData } = maintData;
    
    const { data, error } = await insforge.database
      .from('maintenance')
      .insert([dbData])
      .select()
      .single();
    if (error) throw new Error(error.message);

    if (parts_used && parts_used.length > 0) {
      const partsPayload = parts_used.map(p => ({
        maintenance_id: data.maintenance_id,
        part_id: p.part_id,
        quantity_used: p.quantity_used
      }));
      
      const { error: partErr } = await insforge.database
        .from('maintenance_parts')
        .insert(partsPayload);
      if (partErr) console.error('Error inserting maintenance parts:', partErr);
      
      for (const p of parts_used) {
        const { data: part } = await insforge.database
          .from('spare_parts')
          .select('quantity')
          .eq('part_id', p.part_id)
          .single();
        
        if (part) {
          await insforge.database
            .from('spare_parts')
            .update({ quantity: Math.max(0, part.quantity - p.quantity_used) })
            .eq('part_id', p.part_id);
        }
      }
    }

    return data;
  },

  logTelemetry: async (telemetryData) => {
    const token = getAuthToken();
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    const { data, error } = await insforge.functions.invoke('predict-failure', {
      headers,
      body: {
        ...telemetryData,
        logTelemetry: true
      }
    });
    if (error) throw new Error(error.message);
    return data;
  },

  predictFailure: async (predictionData) => {
    const token = getAuthToken();
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    const { data, error } = await insforge.functions.invoke('predict-failure', {
      headers,
      body: predictionData
    });
    if (error) throw new Error(error.message);
    return data.prediction;
  },

  askWorkshopAssistant: async (messages) => {
    const token = getAuthToken();
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    const { data, error } = await insforge.functions.invoke('workshop-assistant', {
      headers,
      body: { messages }
    });
    if (error) throw new Error(error.message);
    return data.reply;
  },

  getTelemetryLogs: async (machineId) => {
    let query = insforge.database
      .from('telemetry_log')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(20);
    
    if (machineId) {
      query = query.eq('machine_id', machineId);
    }
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data;
  },

  downloadPdf: async (type, filename) => {
    const token = getAuthToken();
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    const { data, error } = await insforge.functions.invoke('generate-report', {
      method: 'POST',
      headers,
      body: { type }
    });
    if (error) throw new Error(error.message);

    // Decode base64 PDF string to Uint8Array
    const binaryString = window.atob(data.pdf);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const blob = new Blob([bytes], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
  }
};

if (typeof window !== 'undefined') {
  window.api = api;
}

