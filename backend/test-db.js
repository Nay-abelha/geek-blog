const mysql = require('mysql2');
require('dotenv').config();

const conn = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

conn.connect(err => {
    if (err) {
        console.error('❌ ERRO DE CONEXÃO:', err.message);
        process.exit(1);
    }
    console.log('✅ Conexão estabelecida com MySQL!');
    
    conn.query('SHOW TABLES', (err, rows) => {
        if (err) {
            console.error('❌ ERRO NA QUERY:', err.message);
            process.exit(1);
        }
        console.log('📋 Tabelas encontradas:');
        rows.forEach(row => {
            const tableName = Object.values(row)[0];
            console.log(`  - ${tableName}`);
        });
        conn.end();
    });
});