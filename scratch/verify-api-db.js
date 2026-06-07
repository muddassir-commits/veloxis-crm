const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Parse .env.local
const envPath = path.join(__dirname, '../.env.local');
if (!fs.existsSync(envPath)) {
  console.error('❌ .env.local file not found at: ' + envPath);
  process.exit(1);
}

const envData = fs.readFileSync(envPath, 'utf8');
const env = {};
envData.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return;
  const parts = trimmed.split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    const value = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
    env[key] = value;
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;
const cronSecret = env.CRON_SECRET;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase URL or Service Role Key missing in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('🔄 Starting Database & API Verification...\n');

  let dbOk = true;

  // 1. Direct DB GET/READ Tests
  const tables = ['clients', 'leads', 'invoices', 'projects', 'tasks', 'profiles', 'audit_logs'];
  for (const table of tables) {
    try {
      const start = Date.now();
      const { data, error } = await supabase.from(table).select('*').limit(1);
      const duration = Date.now() - start;
      if (error) {
        console.error(`❌ DB Read Failed for table "${table}":`, error.message);
        dbOk = false;
      } else {
        console.log(`✅ DB Read Success for table "${table}" (${data.length} records fetched in ${duration}ms)`);
      }
    } catch (e) {
      console.error(`❌ DB Read Exception for table "${table}":`, e.message);
      dbOk = false;
    }
  }

  console.log('');

  // 2. DB WRITE / UPDATE / DELETE Tests
  let writeOk = false;
  let testClientId = null;
  try {
    console.log('🔄 Testing DB Write (Insert)...');
    const { data: client, error: insertError } = await supabase.from('clients').insert({
      name: 'TEST_VERIFICATION_CLIENT_DELETE_ME',
      email: 'verification-test@veloxisglobal.com',
      phone: '+1234567890',
      status: 'active'
    }).select().single();

    if (insertError) {
      console.error('❌ DB Write Failed:', insertError.message);
    } else {
      testClientId = client.id;
      console.log(`✅ DB Write Success! Inserted client ID: ${testClientId}`);

      console.log('🔄 Testing DB Update (Modify)...');
      const { data: updated, error: updateError } = await supabase.from('clients').update({
        phone: '+9876543210'
      }).eq('id', testClientId).select().single();

      if (updateError) {
        console.error('❌ DB Update Failed:', updateError.message);
      } else if (updated.phone === '+9876543210') {
        console.log('✅ DB Update Success!');
        writeOk = true;
      } else {
        console.error('❌ DB Update mismatch phone value:', updated.phone);
      }
    }
  } catch (e) {
    console.error('❌ DB Write/Update Exception:', e.message);
  } finally {
    if (testClientId) {
      console.log('🔄 Testing DB Delete (Cleanup)...');
      try {
        const { error: deleteError } = await supabase.from('clients').delete().eq('id', testClientId);
        if (deleteError) {
          console.error('❌ DB Cleanup Delete Failed:', deleteError.message);
        } else {
          console.log('✅ DB Cleanup Delete Success!');
        }
      } catch (e) {
        console.error('❌ DB Cleanup Exception:', e.message);
      }
    }
  }

  console.log('');

  // 3. API Endpoint Verification via local dev server
  const devServerUrl = 'http://localhost:3005';
  console.log(`🔄 Checking API routes on local dev server: ${devServerUrl}...`);

  const apiEndpoints = [
    {
      name: 'Bypassed Cron Sync (/api/integrations/sync-all with secret)',
      url: `${devServerUrl}/api/integrations/sync-all`,
      headers: { 'x-cron-secret': cronSecret },
      expectedStatus: 200,
    },
    {
      name: 'Blocked Cron Sync (/api/integrations/sync-all without secret)',
      url: `${devServerUrl}/api/integrations/sync-all`,
      headers: {},
      expectedStatus: 401,
    },
    {
      name: 'Unauthenticated Dashboard redirect (/dashboard)',
      url: `${devServerUrl}/dashboard`,
      headers: {},
      expectedStatus: 307, // Redirect status (Next.js server redirect)
      redirectOk: true
    },
    {
      name: 'Finance check overdue (/api/finance/check-overdue with secret)',
      url: `${devServerUrl}/api/finance/check-overdue`,
      headers: { 'x-cron-secret': cronSecret },
      expectedStatus: 200,
    },
    {
      name: 'Cron monthly calls (/api/cron/monthly-calls with secret)',
      url: `${devServerUrl}/api/cron/monthly-calls`,
      headers: { 'x-cron-secret': cronSecret },
      expectedStatus: 200,
    }
  ];

  let apiOk = true;

  for (const ep of apiEndpoints) {
    try {
      const start = Date.now();
      const res = await fetch(ep.url, {
        headers: ep.headers,
        redirect: 'manual'
      });
      const duration = Date.now() - start;

      const isRedirect = res.status >= 300 && res.status < 400;
      const statusMatches = res.status === ep.expectedStatus || (ep.redirectOk && isRedirect);

      if (statusMatches) {
        console.log(`✅ API Success for [${ep.name}]: Status ${res.status} (${duration}ms)`);
      } else {
        console.error(`❌ API Failure for [${ep.name}]: Expected status ${ep.expectedStatus}, got ${res.status}`);
        apiOk = false;
      }
    } catch (e) {
      console.error(`❌ API Exception for [${ep.name}]: ${e.message}`);
      apiOk = false;
    }
  }

  console.log('\n======================================');
  if (dbOk && writeOk && apiOk) {
    console.log('🎉 ALL DATABASE AND API VERIFICATIONS PASSED!');
    process.exit(0);
  } else {
    console.error('❌ SOME VERIFICATIONS FAILED. Check output above.');
    process.exit(1);
  }
}

run();
