# MASTERPLAN.md — AEGIS POS Refactor & Mobile Expansion (Claude-Proof)

Dokumen ini adalah **instruksi utama (source of truth)** untuk Claude Code.

Claude WAJIB membaca dan mengikuti dokumen ini sebelum melakukan perubahan apa pun.

---

# 🚨 MODE OPERASI WAJIB

Sebelum melakukan apa pun:

1. Baca seluruh dokumen ini dan codebase
2. JANGAN ubah file apa pun
3. JANGAN langsung refactor
4. WAJIB kasih audit + rencana dulu

Jika Claude melanggar ini → STOP

---

# 🎯 TUJUAN

Mengubah repo dari:

* Web-only (Next.js)

Menjadi:

* Web (tetap stabil)
* Mobile (React Native)
* Shared logic (core)

Tanpa:

* merusak UI web
* mengubah business logic
* mengubah behavior

---

# 🧠 PRINSIP UTAMA

## 🔒 NON-NEGOTIABLE RULES

Claude DILARANG:

* ❌ Mengubah UI web
* ❌ Mengubah hasil perhitungan logic
* ❌ Rewrite function yang sudah ada
* ❌ Refactor besar sekaligus
* ❌ Rename massal
* ❌ Copy-paste logic ke mobile
* ❌ Convert HTML ke React Native langsung

Claude WAJIB:

* ✅ Move, not rewrite
* ✅ Extract, not duplicate
* ✅ Incremental change only
* ✅ Preserve behavior 100%

---

# 📁 TARGET STRUCTURE

```bash
POS-SYSTEM/
├── apps/
│   ├── web/
│   └── mobile/
│
├── packages/
│   ├── core/
│   └── api/
│
├── tooling/
│   ├── claude/
│   ├── agents/
│   ├── playwright/
│   └── scripts/
│
├── mobile-preview.html
├── MASTERPLAN.md
└── package.json
```

---

# 🧩 DEFINISI TIAP LAYER

## apps/web

* UI existing
* Tidak boleh berubah secara visual
* Boleh internal import dari core

## apps/mobile

* UI baru (React Native)
* UX boleh berbeda total
* Logic harus dari core

## packages/core

Berisi:

* cart
* pricing
* tax
* points
* filtering
* cek database shcema with mcp supabase
* dan lain-lain, kamu bisa periksa project untuk lebih lengkapnya

Semua harus:

* pure function
* tanpa UI

## tooling

Semua hal non-app dipindah ke sini

---

# 📱 MOBILE PREVIEW

`mobile-preview.html` adalah:

* REFERENSI desain
* BUKAN source code

Claude DILARANG:

* copy HTML

Claude HARUS:

* interpret design
* rebuild di React Native

---

# ⚙️ WORKFLOW WAJIB

## STEP 1 — AUDIT (WAJIB)

Claude HARUS output:

* mapping UI vs logic vs API
* file mana aman dipindah
* risiko perubahan

❗ Tidak boleh ubah code

---

## STEP 2 — MICRO REFACTOR

Refactor hanya:

* 1 bagian kecil (contoh: pricing)

Rules:

* tidak ubah behavior
* tidak sentuh UI

---

## STEP 3 — VERIFY

Claude harus memastikan:

* web tetap jalan
* output sama

---

## STEP 4 — REPEAT

lanjut ke bagian lain

---

## STEP 5 — MOBILE

Setelah core siap:

* buat apps/mobile
* build UI baru
* pakai core

---

# 🔒 GUARDRAIL (CRITICAL)

Claude WAJIB:

* stop jika perubahan besar diperlukan
* minta konfirmasi jika ragu
* tidak membuat keputusan arsitektur besar tanpa izin

---

# 🧠 STYLE EKSEKUSI

Claude harus:

* konservatif
* presisi
* tidak over-engineer
* tidak improvisasi di luar scope

---

# 📌 PROMPT ENTRY (WAJIB DIGUNAKAN)

Gunakan ini saat mulai:

```text
Baca MASTERPLAN.md secara menyeluruh.
Jangan ubah file apa pun.
Lakukan audit repo dan jelaskan rencana langkah pertama.
Fokus menjaga web tetap utuh.
```

---

# 📌 PROMPT LANJUTAN

## Extract

```text
Refactor hanya pricing logic ke packages/core.
Jangan ubah behavior.
Jangan sentuh UI.
```

## Mobile

```text
Buat apps/mobile.
Gunakan core.
Gunakan mobile-preview.html sebagai referensi saja.
Jangan duplikasi logic.
```

---

# ✅ DEFINITION OF DONE

* Web tidak berubah
* Logic tetap sama
* Core terbentuk
* Mobile bisa pakai core

---

# 🌐 DEPLOYMENT SAFETY (GITHUB + VERCEL)

Repo ini terhubung ke GitHub dan otomatis ter-deploy ke Vercel.

Artinya:
Setiap push berpotensi mempengaruhi production.

## ⚠️ ATURAN WAJIB

Claude DILARANG:

* ❌ Mengubah struktur root project tanpa instruksi eksplisit
* ❌ Memindahkan Next.js app tanpa mempertimbangkan Vercel config
* ❌ Mengubah config build tanpa verifikasi

Claude WAJIB:

* ✅ Menjaga struktur agar Vercel tetap bisa build
* ✅ Memastikan perubahan tidak merusak deployment
* ✅ Memberi peringatan jika perubahan berisiko ke production

## 🔒 STRATEGI AMAN

* Jangan ubah root project di awal refactor
* Lakukan perubahan kecil dan bertahap
* Pastikan setiap perubahan masih bisa di-build
* Jika perlu ubah struktur besar (misal ke apps/web), WAJIB jelaskan langkah konfigurasi Vercel terlebih dahulu

## 📌 CHECK SEBELUM PUSH

Sebelum push, Claude harus memastikan:

* Build tidak error
* Import path valid
* Config Next.js masih sesuai
* Confirmation ke Jhordi untuk melakukan push setelah jhordi mereview pekerjaan
* Tidak ada perubahan yang membuat app tidak terdeteksi oleh Vercel

Jika ada risiko deployment gagal:
👉 Claude harus STOP dan menjelaskan risiko tersebut terlebih dahulu

---

# 🚀 FINAL NOTE

Ini bukan refactor biasa.

Ini adalah:

* fondasi scaling
* multi-platform architecture
* system design upgrade

Claude harus bekerja dengan presisi tinggi.

Jika ada konflik antara "rapi" vs "aman":

👉 PILIH AMAN
