const mysql = require('mysql2');
const fs = require('fs');
const path = require('path');

const sql = fs.readFileSync(path.join(__dirname, 'nexum_schema_final.sql'), 'utf8');

const conn = mysql.createConnection({
  host: 'mysql-1b068af-aluno-3528.g.aivencloud.com',
  port: 12263,
  user: 'avnadmin',
  password: 'AVNS_IrY1IM_gOJDjL6v_p8Y',
  database: 'nexum',
  ssl: { rejectUnauthorized: false },
  multipleStatements: true
});

conn.connect(err => {
  if (err) { console.error('Erro de conexão:', err); process.exit(1); }
  console.log('Conectado! Rodando SQL...');
  conn.query(sql, (err) => {
    if (err) { console.error('Erro no SQL:', err); }
    else { console.log('Tabelas criadas com sucesso!'); }
    conn.end();
  });
});