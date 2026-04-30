const fs = require('fs');
const paths = [
  './schema-only.sql'
];

let finalSql = "-- AEGIS POS 1:1 MASTER MIGRATION FILE\n";
finalSql += "SET session_replication_role = replica;\n\n";

// Tambahkan skema
finalSql += fs.readFileSync('schema-only.sql', 'utf8') + "\n\n";

// Saya akan menulis instruksi INSERT yang sudah saya dapatkan ke file ini.
// Karena data ini ada di memory context saya, saya akan mengeluarkannya sekarang.
console.log("Compiling final SQL file...");

fs.writeFileSync('data-migration.sql', finalSql);
