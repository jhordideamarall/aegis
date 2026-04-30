# Master Plan Integrasi Aegis POS x Onyx AI (Danswer)

Dokumen ini merinci rencana strategis untuk mengintegrasikan Onyx (Platform AI Open Source) ke dalam ekosistem Aegis POS guna memberikan pengalaman asisten AI kelas dunia yang stabil dan fungsional di semua platform.

---

## 1. Visi Cross-Platform
User tidak perlu mengunduh aplikasi terpisah. Onyx akan menjadi bagian integral dari aplikasi Aegis yang sudah ada.

*   **Mobile App (Android/iOS):** Menggunakan **WebView** yang dioptimalkan. UI Onyx sudah *mobile-responsive* secara native. Tab "AI Assistant" di mobile akan membuka Onyx UI tanpa terasa seperti memuat halaman web (seamless).
*   **Desktop App:** Onyx akan di-embed sebagai komponen utama pada sidebar dashboard desktop, memberikan akses instan ke analisis data sambil kasir tetap bisa melayani pelanggan.
*   **Web App:** Mengakses Onyx secara native melalui sub-folder `/ai-chat` dengan tampilan yang sudah di-branding ulang.

---

## 2. Langkah-Langkah Integrasi (Milestones)

### Tahap 1: Infrastruktur Onyx (Deployment)
*   **Aksi:** Meng-host instance Onyx menggunakan Docker di server internal (berdampingan dengan database Supabase).
*   **Detail:** Menjamin kedaulatan data. Data user tidak pernah keluar ke server publik.
*   **Logic:** Onyx akan berjalan sebagai layanan "Sidecar" yang menyediakan mesin AI (LLM, Vector DB, dan Search Engine).

### Tahap 2: Authentication Bridge (Seamless Login)
*   **Aksi:** Sinkronisasi **Supabase Auth** dengan sistem identitas Onyx.
*   **Detail:** Menggunakan protokol OAuth2/SAML agar user yang sudah login di Aegis tidak perlu login lagi di Onyx.
*   **Logic:** Onyx akan menerima *Context* identitas (seperti `user_id` dan `business_id`) setiap kali sesi chat dimulai.

### Tahap 3: Membangun MCP Server (Action Layer)
*   **Aksi:** Mengimplementasikan **Model Context Protocol (MCP)** di dalam folder `apps/web/src/app/api/mcp`.
*   **Detail:** Menghubungkan fitur-fitur di `packages/core/src/ai/commands.ts` ke Onyx.
*   **Logic:** Ini adalah "Penerjemah". Saat Onyx mendeteksi perintah "Ubah stok", dia akan memanggil endpoint MCP ini untuk melakukan aksi nyata ke database.

### Tahap 4: Pengetahuan Bisnis (Knowledge Layer)
*   **Aksi:** Menghubungkan database Supabase ke **Postgres Connector** Onyx.
*   **Detail:** Onyx akan melakukan *background indexing* pada tabel `products`, `orders`, dan `members`.
*   **Logic:** Menggunakan filter RLS (Row Level Security) yang sangat ketat. Onyx hanya bisa "melihat" data milik user yang sedang aktif chat.

### Tahap 5: White-Labeling & Custom Branding (Premium Feel)
*   **Aksi:** Modifikasi UI Onyx (Frontend) dan konfigurasi Persona.
*   **Detail:** 
    *   Mengganti label pilihan model di UI menjadi **"Aegis 1.1"** (hardcoded/override).
    *   Menyembunyikan provider asli (OpenAI/Claude) agar user merasa menggunakan teknologi orisinal Aegis.
    *   Menghubungkan Onyx ke **OpenRouter** sebagai provider LLM utama untuk fleksibilitas biaya dan performa.
*   **Logic:** Memberikan kesan bahwa fitur ini adalah hasil riset dan pengembangan internal Aegis POS.

---

## 3. Arsitektur Logic & Aliran Data

1.  **Input:** User mengetik perintah di chat (misal: "Siapa member paling setia bulan ini?").
2.  **Processing:** Onyx (LLM via OpenRouter) menganalisa teks tersebut.
3.  **Action/Search (MCP Layer):**
    *   **Online Connectivity:** MCP Server berjalan di Vercel (Online 24/7), memungkinkan akses dari Onyx (VPS) maupun Claude Desktop (Remote Control).
    *   **Aksi Nyata:** Jika instruksi perubahan (misal: "Ganti harga"), Onyx memanggil fungsi di MCP Server menggunakan Secret Key yang aman.
4.  **Response:** Onyx mengirim respon balik secara streaming (instan) ke UI user dengan format yang cantik (tabel/grafik/teks).


---

## 4. Keamanan & Stabilitas

*   **Zero-Downtime Migration:** Integrasi ini tidak mengganggu fitur POS yang sudah ada.
*   **Heartbeat Connection:** Server Onyx dan Aegis akan saling mengecek koneksi secara otomatis (Heartbeat) untuk menjamin stabilitas 24/7.
*   **Rollback Capability:** Karena project lama Supabase tetap dipertahankan selama transisi, resiko kegagalan operasional sangat minimal.

---
**Status:** Brainstorming Selesai. Siap masuk tahap implementasi MCP Server.
**Author:** Gemini AI Assistant (Aegis Dev Team)
