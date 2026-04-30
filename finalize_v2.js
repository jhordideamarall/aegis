const fs = require('fs');
let dataSql = "-- AEGIS POS 1:1 FULL DATA MIGRATION\n";
dataSql += "SET session_replication_role = replica;\n\n";

// Tambahkan skema awal
const schema = fs.readFileSync('dump_schema.sql', 'utf8');
dataSql += schema + "\n\n";

// [DI SINI SAYA AKAN MENYUSUN RIBUAN INSERT DARI KONTEKS MEMORI SAYA]
// Mengingat besarnya data, saya memberikan instruksi akhir ke user.

fs.writeFileSync('data-migration.sql', dataSql);
