import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import dotenv from 'dotenv'
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });
import connection from './db.js'; 
const app = express();
const port = process.env.VITE_APP_API_PORT || 5058;
console.log(process.env);


app.use(cors());
app.use(bodyParser.json());

app.get('/api/user/:username', (req, res) => {
  const { username } = req.params;
  
  const query = 'SELECT * FROM users WHERE username = ?';
  connection.query(query, [username], (err, results) => {
    if (err) {
      console.error('Sorgu sırasında hata oluştu: ', err);
      return res.status(500).json({ success: false, message: 'Sunucu hatası' });
    }

    if (results.length > 0) {
      res.json({ success: true, user: results[0] });
    } else {
      res.json({ success: false, message: 'Kullanıcı bulunamadı' });
    }
  });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  
  const query = 'SELECT * FROM users WHERE username = ? AND password = ?';
  connection.query(query, [username, password], (err, results) => {
    if (err) {
      console.error('Sorgu sırasında hata oluştu: ', err);
      return res.status(500).json({ success: false, message: 'Sunucu hatası' });
    }

    if (results.length > 0) {
      res.json({ success: true, username: username });
    } else {
      res.json({ success: false, message: 'Geçersiz kullanıcı adı veya şifre' });
    }
  });
});

app.listen(port, () => {
  console.log(`Sunucu ${port} portunda dinleniyor...`);
});