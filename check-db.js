const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envPath = path.join(__dirname, '.env.local');
if (!fs.existsSync(envPath)) {
  console.error('Error: .env.local file not found at:', envPath);
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach((line) => {
  const cleanLine = line.trim();
  if (cleanLine && !cleanLine.startsWith('#')) {
    const match = cleanLine.match(/^([^=]+)=(.*)$/);
    if (match) {
      envVars[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, '');
    }
  }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkDb() {
  try {
    console.log('--- LEADS IN DATABASE ---');
    const { data: leads } = await supabase.from('leads').select('*');
    leads.forEach((l) => {
      console.log(`Lead ID: ${l.id} | Name: ${l.name} | Status: ${l.status} | Value: ${l.estimated_value} | Converted To: ${l.converted_to}`);
    });

    console.log('\n--- CLIENTS IN DATABASE ---');
    const { data: clients } = await supabase.from('clients').select('*');
    clients.forEach((c) => {
      console.log(`Client ID: ${c.id} | Name: ${c.name} | Status: ${c.status} | Retainer: ${c.monthly_retainer} | Is Agency: ${c.is_agency_self}`);
    });
  } catch (err) {
    console.error('Error:', err.message);
  }
}

checkDb();
