-- Create employee profile table linked to auth.users
CREATE TABLE public.employee (
    employee_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL CHECK (role IN ('Admin', 'Engineer', 'Technician'))
);

-- Trigger to automatically create an employee profile when an auth.user is registered
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.employee (employee_id, name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.profile->>'name', 'New Employee'),
    NEW.email,
    COALESCE(NEW.profile->>'role', 'Technician')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create Machine table
CREATE TABLE public.machine (
    machine_id TEXT PRIMARY KEY,
    machine_name TEXT NOT NULL,
    department TEXT NOT NULL,
    installation_date DATE NOT NULL,
    running_hours DOUBLE PRECISION DEFAULT 0.0,
    last_service DATE,
    status TEXT DEFAULT 'Operational' CHECK (status IN ('Operational', 'Under Maintenance', 'Down'))
);

-- Create Spare Parts table
CREATE TABLE public.spare_parts (
    part_id SERIAL PRIMARY KEY,
    part_number TEXT NOT NULL UNIQUE,
    part_name TEXT NOT NULL,
    category TEXT NOT NULL,
    quantity INTEGER DEFAULT 0,
    min_stock INTEGER DEFAULT 10,
    supplier TEXT NOT NULL,
    location TEXT NOT NULL
);

-- Create Maintenance table
CREATE TABLE public.maintenance (
    maintenance_id SERIAL PRIMARY KEY,
    machine_id TEXT REFERENCES public.machine(machine_id) ON DELETE CASCADE NOT NULL,
    maintenance_date DATE NOT NULL,
    technician TEXT NOT NULL,
    remarks TEXT,
    status TEXT DEFAULT 'Scheduled' CHECK (status IN ('Completed', 'Scheduled', 'Overdue'))
);

-- Create Maintenance Parts table
CREATE TABLE public.maintenance_parts (
    id SERIAL PRIMARY KEY,
    maintenance_id INTEGER REFERENCES public.maintenance(maintenance_id) ON DELETE CASCADE NOT NULL,
    part_id INTEGER REFERENCES public.spare_parts(part_id) ON DELETE CASCADE NOT NULL,
    quantity_used INTEGER NOT NULL
);

-- Create AI Prediction table
CREATE TABLE public.ai_prediction (
    prediction_id SERIAL PRIMARY KEY,
    machine_id TEXT REFERENCES public.machine(machine_id) ON DELETE CASCADE NOT NULL,
    failure_probability DOUBLE PRECISION NOT NULL,
    risk_level TEXT NOT NULL CHECK (risk_level IN ('Low', 'Medium', 'High')),
    prediction_date TIMESTAMPTZ DEFAULT NOW(),
    recommendations TEXT
);

-- Create Telemetry Log table
CREATE TABLE public.telemetry_log (
    log_id SERIAL PRIMARY KEY,
    machine_id TEXT REFERENCES public.machine(machine_id) ON DELETE CASCADE NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    temperature DOUBLE PRECISION NOT NULL,
    vibration DOUBLE PRECISION NOT NULL
);

-- Turn on Row Level Security (RLS) on all public tables
ALTER TABLE public.employee ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machine ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spare_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_prediction ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telemetry_log ENABLE ROW LEVEL SECURITY;

-- Enable permissions policies for authenticated users
CREATE POLICY "authenticated read employee" ON public.employee FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated write employee" ON public.employee FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated read machine" ON public.machine FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated write machine" ON public.machine FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated read spare_parts" ON public.spare_parts FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated write spare_parts" ON public.spare_parts FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated read maintenance" ON public.maintenance FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated write maintenance" ON public.maintenance FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated read maintenance_parts" ON public.maintenance_parts FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated write maintenance_parts" ON public.maintenance_parts FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated read ai_prediction" ON public.ai_prediction FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated write ai_prediction" ON public.ai_prediction FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated read telemetry_log" ON public.telemetry_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated write telemetry_log" ON public.telemetry_log FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Grant privileges
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO authenticated;
