# 🔐 Superadmin Access Guide - AEGIS POS

## Overview

Platform ini memiliki **Superadmin Dashboard** di `/admin` untuk mengelola semua tenant/business yang ada di platform AEGIS POS.

---

## 🏠 Development (Lokal)

### 1. Setup Environment

Tambahkan ke `.env.local`:

```env
ADMIN_EMAILS=admin@socialbrand1980.com
ADMIN_PASSWORD=your_secure_password_here
```

**Catatan:** 
- `ADMIN_EMAILS` bisa multiple emails, pisahkan dengan koma: `admin@example.com,owner@example.com`
- `ADMIN_PASSWORD` hanya diperlukan saat membuat user admin pertama kali

### 2. Buat Admin User

**Opsi A: Menggunakan Script (Recommended)**

```bash
# Setup password dulu di .env.local
echo "ADMIN_PASSWORD=YourSecurePassword123!" >> .env.local

# Jalankan script
node scripts/create-admin.mjs
```

Script ini akan:
1. Membaca credentials dari `.env.local`
2. Membuat user di Supabase Auth
3. Auto-confirm email (tidak perlu verifikasi email)

**Opsi B: Manual via Supabase Dashboard**

1. Buka [Supabase Dashboard](https://supabase.com/dashboard)
2. Pilih project Anda
3. Go to **Authentication** → **Users**
4. Click **Add User** → **Create new user**
5. Isi:
   - Email: `admin@socialbrand1980.com`
   - Password: (secure password)
   - Auto Confirm User: ✅ **Check this**
6. Click **Create User**

### 3. Akses Admin Dashboard

**Step 1: Start Development Server**
```bash
npm run dev
```

**Step 2: Buka Admin Login**
```
http://localhost:3000/admin/login
```

**Step 3: Login**
- Email: `admin@socialbrand1980.com`
- Password: (password yang Anda set)

**Step 4: Dashboard**
Setelah login berhasil, akan redirect ke:
```
http://localhost:3000/admin
```

---

## 🚀 Production

### 1. Set Environment Variables di Vercel

Go to **Vercel Dashboard** → Project → **Settings** → **Environment Variables**

Tambahkan:

```env
# Production
ADMIN_EMAILS=admin@socialbrand1980.com
ADMIN_PASSWORD=YourSecureProductionPassword!

# Preview (optional - jika ingin test di preview)
ADMIN_EMAILS=admin@socialbrand1980.com
ADMIN_PASSWORD=YourSecurePreviewPassword!
```

**Security Best Practices:**
- Gunakan password yang kuat (min 16 karakter, kombinasi huruf, angka, simbol)
- Jangan commit `.env.local` ke Git
- Rotate password secara berkala

### 2. Create Admin User di Production

**Via Supabase Dashboard:**

1. Buka [Supabase Dashboard](https://supabase.com/dashboard)
2. Pilih project **Production**
3. **Authentication** → **Users** → **Add User**
4. Create user dengan email yang ada di `ADMIN_EMAILS`
5. ✅ **Auto Confirm User**
6. Simpan password dengan aman (password manager)

**Via Script (Local dengan Production Keys):**

```bash
# Temporary set production credentials di .env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-prod-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-prod-service-role-key
ADMIN_EMAILS=admin@socialbrand1980.com
ADMIN_PASSWORD=YourSecurePassword!

# Run script
node scripts/create-admin.mjs

# ⚠️ IMPORTANT: Kembalikan .env.local ke development credentials!
```

### 3. Akses Admin Dashboard Production

**URL:**
```
https://your-domain.com/admin/login
```

**Login dengan:**
- Email: `admin@socialbrand1980.com`
- Password: (password yang Anda set)

---

## 🔒 Security

### Admin Authorization Flow

1. User login via `/admin/login`
2. System create session di Supabase Auth
3. Setiap request ke `/api/admin/*` akan validate:
   - User authenticated? (check session)
   - User email ada di `ADMIN_EMAILS`? (check authorization)
4. Jika salah satu fail → `401 Unauthorized` atau `403 Forbidden`

### Environment Variables

**Required:**
- `ADMIN_EMAILS` - Comma-separated list of admin emails
- `SUPABASE_SERVICE_ROLE_KEY` - Untuk create admin user (server-side only)

**Optional:**
- `ADMIN_PASSWORD` - Hanya untuk script setup awal

### RLS Policies

Admin user tetap subject to RLS policies, tapi API routes menggunakan `supabaseAdmin` (service role key) yang bypass RLS untuk operasi admin.

---

## 📋 Admin Dashboard Features

Admin dashboard (`/admin`) memiliki:

### Overview Stats
- Total Businesses/Tenants
- Active Businesses
- Total Orders (all tenants)
- Total Revenue (all tenants)
- Total Members
- Total Products

### Business Management
- List semua businesses
- View detail setiap business
- Stats per business
- Filter by time range

### Feature Updates
- Create/edit/publish feature updates
- Email announcements
- WhatsApp notifications to all tenants

---

## 🛠️ Troubleshooting

### Problem: "Access denied. Your email is not registered as admin."

**Cause:** Email yang digunakan login tidak ada di `ADMIN_EMAILS`

**Solution:**
1. Check `.env.local` (dev) atau Vercel Environment Variables (prod)
2. Pastikan email yang digunakan login ada di `ADMIN_EMAILS`
3. Restart server (dev) atau redeploy (prod)

```env
# .env.local
ADMIN_EMAILS=admin@socialbrand1980.com,youremail@example.com
```

### Problem: "Invalid login credentials"

**Cause:** Email/password salah atau user belum dibuat

**Solution:**
1. Jalankan `node scripts/create-admin.mjs` untuk create user
2. Atau create manual via Supabase Dashboard
3. Pastikan password benar

### Problem: Redirect loop ke `/admin/login`

**Cause:** Session tidak tersimpan atau expired

**Solution:**
1. Clear browser cookies untuk localhost/domain Anda
2. Logout dan login ulang
3. Check browser console untuk errors

### Problem: Admin dashboard kosong/no data

**Cause:** 
- Belum ada businesses di database
- RLS policies block access

**Solution:**
1. Check di Supabase Dashboard → Table Editor → `businesses` table
2. Pastikan ada data
3. Check API logs di Vercel/Netlify

---

## 📝 Multiple Admins

Untuk menambahkan multiple admin users:

**Development:**
```env
.env.local
ADMIN_EMAILS=admin@socialbrand1980.com,owner@socialbrand1980.com,dev@socialbrand1980.com
```

**Production:**
```
Vercel Environment Variables
ADMIN_EMAILS=admin@socialbrand1980.com,owner@socialbrand1980.com
```

**Create each admin user:**
```bash
# Update .env.local dengan email pertama
ADMIN_EMAILS=admin1@example.com
ADMIN_PASSWORD=Password1!
node scripts/create-admin.mjs

# Update dengan email kedua
ADMIN_EMAILS=admin2@example.com
ADMIN_PASSWORD=Password2!
node scripts/create-admin.mjs

# dst...
```

Atau create manual via Supabase Dashboard untuk setiap admin.

---

## 🎯 Quick Reference

| Environment | URL | Credentials Location |
|-------------|-----|---------------------|
| Development | `http://localhost:3000/admin/login` | `.env.local` |
| Production | `https://your-domain.com/admin/login` | Vercel Dashboard |

**Default Admin Email:** `admin@socialbrand1980.com`

**Script Location:** `scripts/create-admin.mjs`

**Admin API Routes:** `/api/admin/*`

---

## 📞 Support

Jika ada masalah dengan admin access:
1. Check console logs (browser + server)
2. Check Supabase Auth logs
3. Verify environment variables
4. Test API routes directly via Postman/curl

**Example curl test:**
```bash
# Login dan dapat token
curl -X POST https://your-project.supabase.co/auth/v1/token \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@socialbrand1980.com","password":"yourpassword"}'

# Test admin API dengan token
curl https://your-domain.com/api/admin/businesses \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

**Last Updated:** March 2026  
**Version:** 1.3.2
