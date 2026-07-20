import { createAdminClient, createClient } from '@insforge/sdk';

const anonClient = createClient({
  baseUrl: 'https://nqy35aii.us-east.insforge.app',
  anonKey: 'anon_fdfdebe110d0d2310147f15516c9e996df1c0cf090f3ec37b6a0421d029047f6'
});

const adminClient = createAdminClient({
  baseUrl: 'https://nqy35aii.us-east.insforge.app',
  apiKey: 'ik_aee024b4e6eccc1d6dddf3bc268e8e62'
});

async function main() {
  console.log('Starting InsForge seeding...');

  // 1. Clean up existing tables
  console.log('Cleaning up existing database records...');
  
  // Note: we can delete using standard filters
  await adminClient.database.from('telemetry_log').delete().gt('log_id', 0);
  await adminClient.database.from('ai_prediction').delete().gt('prediction_id', 0);
  await adminClient.database.from('maintenance_parts').delete().gt('id', 0);
  await adminClient.database.from('maintenance').delete().gt('maintenance_id', 0);
  await adminClient.database.from('spare_parts').delete().gt('part_id', 0);
  await adminClient.database.from('machine').delete().neq('machine_id', '');
  await adminClient.database.from('employee').delete().neq('email', '');

  console.log('Tables cleaned.');

  // 2. Sign up users
  const users = [
    { email: 'admin@railway.com', password: 'admin123', profile: { name: 'Admin User', role: 'Admin' } },
    { email: 'engineer@railway.com', password: 'engineer123', profile: { name: 'Engineer User', role: 'Engineer' } },
    { email: 'tech@railway.com', password: 'tech123', profile: { name: 'Technician User', role: 'Technician' } }
  ];

  for (const user of users) {
    console.log(`Signing up user ${user.email}...`);
    // Sign up via public client
    const { data, error } = await anonClient.auth.signUp({
      email: user.email,
      password: user.password,
      profile: user.profile
    });

    if (error) {
      console.warn(`Could not sign up ${user.email} (might already exist):`, error.message);
    } else {
      console.log(`Signed up user ${user.email} successfully.`);
    }

    // Since trigger handles initial insert, update the profile role/name directly
    const { error: profileErr } = await adminClient.database
      .from('employee')
      .update({
        name: user.profile.name,
        role: user.profile.role
      })
      .eq('email', user.email);
    
    if (profileErr) {
      console.error(`Error updating profile for ${user.email}:`, profileErr);
    } else {
      console.log(`Updated employee profile for ${user.email}.`);
    }
  }

  // 3. Seed Machines
  console.log('Seeding machines...');
  const machines = [
    { machine_id: 'MAC-001', machine_name: 'Underfloor Wheel Lathe (UFWL-01)', department: 'Wheel Shop', installation_date: '2019-11-12', running_hours: 18450.0, last_service: '2026-06-05', status: 'Operational' },
    { machine_id: 'MAC-002', machine_name: 'CNC Axle Turning Lathe (ATL-03)', department: 'Machine Shop', installation_date: '2021-04-18', running_hours: 9800.0, last_service: '2026-07-02', status: 'Operational' },
    { machine_id: 'MAC-003', machine_name: '500T Hydraulic Wheel Press (HWP-02)', department: 'Wheel Shop', installation_date: '2017-02-25', running_hours: 28200.0, last_service: '2026-07-10', status: 'Under Maintenance' },
    { machine_id: 'MAC-004', machine_name: '50T Overhead EOT Crane (EOT-05)', department: 'Loco Assembly Shop', installation_date: '2015-08-10', running_hours: 34500.0, last_service: '2026-01-20', status: 'Down' },
    { machine_id: 'MAC-005', machine_name: 'Ultrasonic Flaw Detector (UST-04)', department: 'NDT Testing Lab', installation_date: '2023-09-01', running_hours: 3200.0, last_service: '2026-05-18', status: 'Operational' },
    { machine_id: 'MAC-006', machine_name: 'MIG Welding Robot (MWR-02)', department: 'Coach Shell Shop', installation_date: '2022-06-30', running_hours: 12500.0, last_service: '2026-07-08', status: 'Operational' },
    { machine_id: 'MAC-007', machine_name: 'Bogie Wash Plant (BWP-01)', department: 'Bogie Shop', installation_date: '2020-05-15', running_hours: 8900.0, last_service: '2026-06-20', status: 'Operational' },
    { machine_id: 'MAC-008', machine_name: 'CNC Laser Cutting Machine (LCM-02)', department: 'Sheet Metal Shop', installation_date: '2022-10-12', running_hours: 6400.0, last_service: '2026-07-05', status: 'Operational' },
    { machine_id: 'MAC-009', machine_name: 'Traction Motor Tester (TMT-01)', department: 'Electrical Shop', installation_date: '2018-03-22', running_hours: 21500.0, last_service: '2026-02-14', status: 'Under Maintenance' },
    { machine_id: 'MAC-010', machine_name: 'Heavy Duty Coach Jacking System (CJS-04)', department: 'Lifting & Rigging Shop', installation_date: '2016-12-05', running_hours: 15700.0, last_service: '2026-07-12', status: 'Operational' }
  ];

  const { error: machineErr } = await adminClient.database.from('machine').insert(machines);
  if (machineErr) console.error('Error seeding machines:', machineErr);
  else console.log('Machines seeded.');

  // 4. Seed Spare Parts
  console.log('Seeding spare parts...');
  const parts = [
    { part_number: 'PN-1001', part_name: 'Carbide Indexable Inserts', category: 'Cutting Tool', quantity: 75, min_stock: 15, supplier: 'Sandvik Coromant India', location: 'Bin A-1 (Tool Crib)' },
    { part_number: 'PN-2002', part_name: 'UST Sensor Probe 5MHz', category: 'NDT Sensors', quantity: 4, min_stock: 5, supplier: 'GE Measurement & Control', location: 'Bin B-3 (NDT Lab)' },
    { part_number: 'PN-3003', part_name: 'Hydraulic Seal Kit (500T Press)', category: 'Hydraulic Seals', quantity: 3, min_stock: 5, supplier: 'Parker Hannifin India', location: 'Bin C-2 (Fluid Power)' },
    { part_number: 'PN-4004', part_name: 'EOT Crane Brake Shoe Liners', category: 'Brake Linings', quantity: 12, min_stock: 6, supplier: 'BHEL India', location: 'Bin D-1 (Crane Spares)' },
    { part_number: 'PN-5005', part_name: 'MIG Welding Torch Nozzle', category: 'Welding Consumables', quantity: 120, min_stock: 30, supplier: 'Esab India', location: 'Bin E-2 (Welding Shop)' },
    { part_number: 'PN-6006', part_name: 'Bwash High-Pressure Water Jet', category: 'Spray Nozzles', quantity: 2, min_stock: 4, supplier: 'Kärcher India', location: 'Bin F-3 (Maintenance Yard)' },
    { part_number: 'PN-7007', part_name: 'Laser Focus Lens 5 Inch', category: 'Laser Optics', quantity: 6, min_stock: 2, supplier: 'Trumpf India', location: 'Bin G-1 (Electronics Room)' },
    { part_number: 'PN-8008', part_name: 'Traction Motor Carbon Brush', category: 'Electrical Brushes', quantity: 18, min_stock: 20, supplier: 'Mersen India', location: 'Bin H-2 (Electrical Crib)' },
    { part_number: 'PN-9009', part_name: 'Jacking System Hydraulic Pump', category: 'Hydraulic Pumps', quantity: 1, min_stock: 2, supplier: 'Rexroth India', location: 'Bin I-4 (Heavy Rigging)' },
    { part_number: 'PN-1010', part_name: 'High-Temperature Grease EP-2', category: 'Lubricants', quantity: 45, min_stock: 10, supplier: 'Mobil India', location: 'Rack L-1 (Fluids)' }
  ];

  const { error: partErr } = await adminClient.database.from('spare_parts').insert(parts);
  if (partErr) console.error('Error seeding spare parts:', partErr);
  else console.log('Spare parts seeded.');

  // 5. Seed Maintenance Schedules
  console.log('Seeding maintenance schedules...');
  const maintenance = [
    { machine_id: 'MAC-001', maintenance_date: '2026-06-05', technician: 'Technician User', remarks: 'Routine underfloor lathe wheel profiling calibration.', status: 'Completed' },
    { machine_id: 'MAC-003', maintenance_date: '2026-07-10', technician: 'Technician User', remarks: 'Hydraulic pump pressure calibration and seal leak checks.', status: 'Completed' },
    { machine_id: 'MAC-004', maintenance_date: '2026-07-20', technician: 'Engineer User', remarks: 'EOT Crane brake shoe replacement and hoisting gear checking.', status: 'Scheduled' },
    { machine_id: 'MAC-009', maintenance_date: '2026-07-15', technician: 'Technician User', remarks: 'Traction motor commutator inspection and carbon brush replacement.', status: 'Scheduled' },
    { machine_id: 'MAC-002', maintenance_date: '2026-08-05', technician: 'Engineer User', remarks: 'CNC lathe chuck alignment inspection and toolholder lubrication.', status: 'Scheduled' },
    { machine_id: 'MAC-005', maintenance_date: '2026-08-10', technician: 'Technician User', remarks: 'Ultrasonic detector calibration using standard calibration blocks.', status: 'Scheduled' },
    { machine_id: 'MAC-008', maintenance_date: '2026-07-05', technician: 'Engineer User', remarks: 'Laser focus lens cleaning and gas pressure check.', status: 'Completed' },
    { machine_id: 'MAC-007', maintenance_date: '2026-08-22', technician: 'Technician User', remarks: 'Bogie wash plant nozzle cleaning and water filter replacement.', status: 'Scheduled' }
  ];

  const { error: maintErr } = await adminClient.database.from('maintenance').insert(maintenance);
  if (maintErr) console.error('Error seeding maintenance:', maintErr);
  else console.log('Maintenance seeded.');

  // 6. Seed AI Predictions
  console.log('Seeding AI predictions...');
  const predictions = [
    { machine_id: 'MAC-001', failure_probability: 12.5, prediction_date: new Date().toISOString(), recommendations: 'Routine clean and lubricate, Check bolt tightness', risk_level: 'Low' },
    { machine_id: 'MAC-003', failure_probability: 48.0, prediction_date: new Date().toISOString(), recommendations: 'Inspect main cylinder piston seal, Check hydraulic pressure', risk_level: 'Medium' },
    { machine_id: 'MAC-004', failure_probability: 92.5, prediction_date: new Date().toISOString(), recommendations: 'Replace hoisting brake shoe liners, Halt operation for safety audit, Lubricate primary gearbox', risk_level: 'High' },
    { machine_id: 'MAC-009', failure_probability: 78.0, prediction_date: new Date().toISOString(), recommendations: 'Replace carbon brushes, Inspect commutator surface, Verify rotor cooling fan operation', risk_level: 'High' }
  ];

  const { error: predErr } = await adminClient.database.from('ai_prediction').insert(predictions);
  if (predErr) console.error('Error seeding AI predictions:', predErr);
  else console.log('AI predictions seeded.');

  console.log('Seeding complete!');
}

main().catch(console.error);
