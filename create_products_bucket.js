const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envPath = '.env.local';
let envContent;
try {
  envContent = fs.readFileSync(envPath, 'utf8');
} catch (e) {
  envContent = fs.readFileSync('.env', 'utf8');
}
const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL="([^"]+)"/);
const keyMatch = envContent.match(/SUPABASE_SERVICE_ROLE_KEY="([^"]+)"/);

const supabaseUrl = urlMatch ? urlMatch[1] : process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = keyMatch ? keyMatch[1] : process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing credentials in env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) {
    console.error('List error:', listError);
    return;
  }
  const exists = buckets.some(b => b.id === 'products' || b.name === 'products');
  if (exists) {
    console.log('Bucket "products" already exists.');
    return;
  }
  
  const { data, error } = await supabase.storage.createBucket('products', {
    public: true,
    fileSizeLimit: 5242880,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
  });
  
  if (error) {
    console.error('Create error:', error);
  } else {
    console.log('Bucket "products" created successfully!');
  }
}
run();
