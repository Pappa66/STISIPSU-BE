const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

if (!supabase) {
  console.warn('⚠️  SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY tidak diset. File upload akan menggunakan penyimpanan lokal.');
}

module.exports = supabase;
