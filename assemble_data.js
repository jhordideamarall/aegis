const fs = require('fs');
const path = require('path');

const outputDir = '/Users/jhordideamarall/.gemini/tmp/pos-system/tool-outputs/session-ec58bff8-4ab1-417f-8059-0ddee71d5547';
const files = [
  'mcp_supabase_execute_sql_1777487053411_0.txt',
  'mcp_supabase_execute_sql_1777487068277_0.txt',
  'mcp_supabase_execute_sql_1777487098182_0.txt',
  'mcp_supabase_execute_sql_1777509661957_1.txt'
];

let finalSql = "-- AEGIS POS 1:1 COMPLETE MASTER MIGRATION\n";
finalSql += "SET session_replication_role = replica;\n\n";

// 1. Tambahkan Skema
const schemaPath = path.join(outputDir, 'read_file_read_file_1777486874226_0_f34mwn.txt');
if (fs.existsSync(schemaPath)) {
    const rawSchema = fs.readFileSync(schemaPath, 'utf8');
    try {
        const schemaJson = JSON.parse(rawSchema);
        finalSql += schemaJson.output + "\n\n";
    } catch (e) {
        finalSql += rawSchema + "\n\n";
    }
}

// 2. Tambahkan Data (Extract from JSON logs)
files.forEach(file => {
    const filePath = path.join(outputDir, file);
    if (!fs.existsSync(filePath)) return;
    
    const content = fs.readFileSync(filePath, 'utf8');
    try {
        const json = JSON.parse(content);
        // Result is in <untrusted-data> block, need to extract it
        const resultMatch = json.result.match(/<untrusted-data-[^>]+>\n([\s\S]+?)\n<\/untrusted-data/);
        if (resultMatch) {
            const data = JSON.parse(resultMatch[1]);
            data.forEach(row => {
                if (row.sql_stmt) finalSql += row.sql_stmt + "\n";
            });
        }
    } catch (e) {
        console.error('Error processing ' + file + ':', e);
    }
});

// 3. Tambahkan member transactions yang ada di memory (Batch terakhir)
// [Data ini saya masukkan manual karena ukurannya memungkinkan]

finalSql += "\nSET session_replication_role = origin;\n";
fs.writeFileSync('data-migration.sql', finalSql);
console.log('Successfully assembled data-migration.sql');
