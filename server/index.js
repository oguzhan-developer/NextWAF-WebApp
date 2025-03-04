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
  
  const query = `select * from users where username = ?`;
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
  
  const query = `select * from users where username = ? and password = ?`;
  connection.query(query, [username, password], (err, results) => {
    if (err) {
      console.error('Sorgu sırasında hata oluştu: ', err);
      return res.status(500).json({ success: false, message: 'Sunucu hatası' });
    }

    if (results.length > 0) {
      res.json({ success: true, username: username });
    } else {
      console.log("resultss: ", results);
      
      res.json({ success: false, message: 'Geçersiz kullanıcı adı veya şifre' });
    }
  });
});

// Log API'sini düzenlenmiş hali - sayfalama, arama ve sıralama desteği ile
app.get('/api/logs', (req, res) => {
  // URL parametrelerini al
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const search = req.query.search || '';
  const sortField = req.query.sortField || 'timestamp';
  const sortDirection = req.query.sortDirection || 'desc';
  
  // Sayfalama için offset hesapla
  const offset = (page - 1) * limit;
  
  // Toplam kayıt sayısını al (arama filtresi ile)
  let countQuery = 'SELECT COUNT(*) as total FROM logs';
  let queryParams = [];
  
  // Arama filtresi varsa SQL sorgusuna ekle
  if (search) {
    countQuery += ` WHERE 
      id LIKE ? OR
      ip_address LIKE ? OR
      request_method LIKE ? OR
      request_uri LIKE ? OR
      user_agent LIKE ?`;
    const searchParam = `%${search}%`;
    queryParams = [searchParam, searchParam, searchParam, searchParam, searchParam];
  }
  
  // Önce toplam kayıt sayısını bul
  connection.query(countQuery, queryParams, (err, countResult) => {
    if (err) {
      console.error('Log sayısını hesaplarken hata oluştu: ', err);
      return res.status(500).json({ success: false, message: 'Sunucu hatası' });
    }
    
    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limit);
    
    // Ana sorguyu oluştur
    let query = 'SELECT * FROM logs';
    
    // Arama filtresi varsa ekle
    if (search) {
      query += ` WHERE 
        id LIKE ? OR
        ip_address LIKE ? OR
        request_method LIKE ? OR
        request_uri LIKE ? OR
        user_agent LIKE ?`;
    }
    
    // Sıralama ekle
    query += ` ORDER BY id ${sortDirection === 'asc' ? 'asc' : 'desc'}`;
    
    // Sayfalama ekle
    query += ` LIMIT ? OFFSET ?`;
    
    // Sorgu parametrelerine sayfalama parametrelerini ekle
    queryParams.push(limit, offset);
    
    // Sorguyu çalıştır
    connection.query(query, queryParams, (err, results) => {
      if (err) {
        console.error('Logları çekerken hata oluştu: ', err);
        return res.status(500).json({ success: false, message: 'Sunucu hatası' });
      }
      
      // HTTP başlıklarında sayfalama bilgilerini gönder
      res.setHeader('X-Total-Count', total);
      res.setHeader('X-Total-Pages', totalPages);
      res.setHeader('X-Current-Page', page);
      
      // Sonuçları gönder
      res.json(results);
    });
  });
});

app.get('/api/server-stats', (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  const query = `SELECT * FROM sistem_monitor ORDER BY tarih DESC LIMIT ${limit}`;
  connection.query(query, (err, results) => {
    if (err) {
      console.error('Sunucu istatistiklerini çekerken hata oluştu: ', err);
      return res.status(500).json({ success: false, message: 'Sunucu hatası' });
    }
    res.json({ success: true, stats: results });
  });
});

app.listen(port, () => {
  console.log(`Sunucu ${port} portunda dinleniyor...`);
});