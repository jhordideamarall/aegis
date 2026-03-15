/**
 * Script untuk update Feature Announcement ke Supabase
 * 
 * Cara pakai:
 * 1. Pastikan .env.local sudah terisi dengan Supabase credentials
 * 2. Jalankan: node scripts/update-feature-announcement.js
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Baca .env.local secara manual
const envPath = path.join(__dirname, '..', '.env.local')
const envContent = fs.readFileSync(envPath, 'utf-8')

const env = {}
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=')
  if (key && valueParts.length > 0) {
    env[key.trim()] = valueParts.join('=').trim()
  }
})

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing Supabase credentials!')
  console.error('Pastikan .env.local sudah terisi dengan:')
  console.error('  - NEXT_PUBLIC_SUPABASE_URL')
  console.error('  - SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const featureUpdate = {
  slug: 'tenant-subdomain-and-auth-flow-improvements',
  title: 'Tenant Subdomain dan Alur Login Kini Lebih Rapi',
  version: 'v1.2.0',
  summary: 'Kami merilis pembaruan pengalaman multi-tenant yang membuat setiap bisnis memiliki akses sistem POS melalui subdomain masing-masing, dengan alur login dan logout yang lebih konsisten.',
  content: `Pembaruan ini menghadirkan pengalaman tenant yang lebih matang untuk setiap bisnis yang menggunakan Aegis POS.

Sekarang setiap bisnis dapat diakses melalui subdomain tenant masing-masing, seperti namatoko.aegis.socialbrand1980.com. Struktur ini membuat pengalaman penggunaan terasa lebih personal, lebih terpisah antar bisnis, dan lebih siap untuk skala multi-tenant.

Kami juga menyempurnakan alur autentikasi agar perpindahan dari domain utama ke subdomain tenant berjalan lebih stabil. Setelah login, pengguna akan diarahkan ke dashboard tenant sebagai halaman awal, sehingga mereka dapat melihat ringkasan bisnis terlebih dahulu sebelum melanjutkan ke halaman operasional lain seperti POS, Orders, Products, Members, atau Settings.

Untuk pengalaman keluar akun yang lebih konsisten, logout sekarang akan tetap berada di subdomain tenant yang sama. Dengan begitu, pengguna dapat langsung login kembali tanpa harus navigasi ulang ke subdomain bisnis mereka.

Di balik layar, pembaruan ini juga memperkuat fondasi routing subdomain dan penanganan sesi tenant agar lebih siap dipakai di lingkungan production. Tujuannya adalah membuat pengalaman akses bisnis terasa lebih rapi, lebih profesional, dan lebih mudah dikelola ketika jumlah tenant terus bertambah.`,
  highlights: [
    'Setiap bisnis kini dapat diakses melalui subdomain tenant masing-masing.',
    'Setelah login, pengguna diarahkan ke dashboard tenant sebagai halaman awal.',
    'Logout kini tetap berada di subdomain tenant agar login ulang lebih mudah.',
    'Fondasi multi-tenant diperkuat agar transisi domain utama ke subdomain lebih stabil.',
    'Pengalaman akses bisnis terasa lebih personal dan lebih siap untuk skala production.'
  ],
  status: 'published',
  featured: false,
  published_at: new Date().toISOString(),
  created_by_email: 'admin@socialbrand1980.com'
}

async function updateFeatureAnnouncement() {
  try {
    console.log('🔄 Menghubungkan ke Supabase...')
    console.log(`   URL: ${supabaseUrl}`)
    
    // Cek apakah slug sudah ada
    console.log('\n🔍 Mengecek apakah update sudah ada...')
    const { data: existing, error: fetchError } = await supabase
      .from('feature_updates')
      .select('id')
      .eq('slug', featureUpdate.slug)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError
    }

    if (existing) {
      // Update existing
      console.log('✅ Update ditemukan, akan diperbarui...')
      const { data, error } = await supabase
        .from('feature_updates')
        .update({
          title: featureUpdate.title,
          version: featureUpdate.version,
          summary: featureUpdate.summary,
          content: featureUpdate.content,
          highlights: featureUpdate.highlights,
          status: featureUpdate.status,
          featured: featureUpdate.featured,
          published_at: featureUpdate.published_at,
          updated_at: new Date().toISOString()
        })
        .eq('slug', featureUpdate.slug)
        .select()
        .single()

      if (error) throw error

      console.log('✅ Update berhasil diperbarui!')
      console.log(`   ID: ${data.id}`)
      console.log(`   Title: ${data.title}`)
      console.log(`   Version: ${data.version}`)
      console.log(`   Status: ${data.status}`)
    } else {
      // Insert new
      console.log('📝 Update tidak ditemukan, akan dibuat baru...')
      const { data, error } = await supabase
        .from('feature_updates')
        .insert([featureUpdate])
        .select()
        .single()

      if (error) throw error

      console.log('✅ Update berhasil dibuat!')
      console.log(`   ID: ${data.id}`)
      console.log(`   Title: ${data.title}`)
      console.log(`   Version: ${data.version}`)
      console.log(`   Status: ${data.status}`)
    }

    console.log('\n✨ Selesai! Feature update sudah ada di Supabase.')
    console.log('\n📌 Untuk melihat:')
    console.log('   1. Buka Supabase Dashboard')
    console.log('   2. Pilih Table Editor')
    console.log('   3. Buka tabel "feature_updates"')
    console.log(`   4. Cari slug: "${featureUpdate.slug}"`)

  } catch (error) {
    console.error('\n❌ Error:', error.message)
    if (error.hint) {
      console.error('   Hint:', error.hint)
    }
    if (error.details) {
      console.error('   Details:', error.details)
    }
    process.exit(1)
  }
}

updateFeatureAnnouncement()
