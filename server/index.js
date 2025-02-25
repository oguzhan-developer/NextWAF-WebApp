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

app.use(cors());
app.use(bodyParser.json());

app.use((req, res, next) => {
  console.log(`API isteği yapıldı: ${req.method} ${req.url}`);
  next();
});

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

app.get('/api/packets', (req, res) => {
  const query = 'SELECT * FROM packets';
  connection.query(query, (err, results) => {
    if (err) {
      console.error('Logları çekerken hata oluştu: ', err);
      return res.status(500).json({ success: false, message: 'Sunucu hatası' });
    }
    res.json({ success: true, packets: results });
  });
});

app.get('/api/server-stats', (req, res) => {
  const query = 'SELECT * FROM server_stats';
  connection.query(query, (err, results) => {
    if (err) {
      console.error('Sunucu istatistiklerini çekerken hata oluştu: ', err);
      return res.status(500).json({ success: false, message: 'Sunucu hatası' });
    }
    res.json({ success: true, stats: results[0] });
  });
});

app.listen(port, () => {
  console.log(`Sunucu ${port} portunda dinleniyor...`);
});