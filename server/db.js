import mysql from 'mysql2';
import dotenv from 'dotenv'
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });console.log(process.env.VITE_APP_DB_HOST);

const connection = mysql.createConnection({
  host: process.env.VITE_APP_DB_HOST,
  user: process.env.VITE_APP_DB_USER,
  password: process.env.VITE_APP_DB_PASSWORD,
  database: process.env.VITE_APP_DB_NAME,
});

connection.connect((err) => {
  if (err) {
    console.error('Veritabanına bağlanma hatası: ', err);
    return;
  }
  console.log('Veritabanına bağlandı.');
});

export default connection;