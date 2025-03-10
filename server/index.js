import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, "../.env") });
import connection from "./db.js";
const app = express();
const port = process.env.VITE_APP_API_PORT || 5058;

app.use(
  cors({
    exposedHeaders: ["X-Total-Count", "X-Total-Pages", "X-Current-Page"],
    credentials: true,
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(bodyParser.json());

app.use((req, res, next) => {
  console.log(`API isteği yapıldı: ${req.method} ${req.url}`);
  next();
});

app.get("/api/user/:username", (req, res) => {
  const { username } = req.params;

  const query = `select * from users where username = ?`;
  connection.query(query, [username], (err, results) => {
    if (err) {
      console.error("Sorgu sırasında hata oluştu: ", err);
      return res.status(500).json({ success: false, message: "Sunucu hatası" });
    }

    if (results.length > 0) {
      res.json({ success: true, user: results[0] });
    } else {
      res.json({ success: false, message: "Kullanıcı bulunamadı" });
    }
  });
});

app.post("/api/login", (req, res) => {
  const { username, password } = req.body;

  const query = `select * from users where username = ? and password = ?`;
  connection.query(query, [username, password], (err, results) => {
    if (err) {
      console.error("Sorgu sırasında hata oluştu: ", err);
      return res.status(500).json({ success: false, message: "Sunucu hatası" });
    }

    if (results.length > 0) {
      res.json({ success: true, username: username });
    } else {
      console.log("resultss: ", results);

      res.json({
        success: false,
        message: "Geçersiz kullanıcı adı veya şifre",
      });
    }
  });
});

app.get("/api/logs-count", (req, res) => {
  const search = req.query.search || "";

  let countQuery = "SELECT COUNT(*) as count FROM logs";
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
    queryParams = [
      searchParam,
      searchParam,
      searchParam,
      searchParam,
      searchParam,
    ];
  }

  connection.query(countQuery, queryParams, (err, results) => {
    if (err) {
      console.error("Log sayısını hesaplarken hata oluştu: ", err);
      return res.status(500).json({ success: false, message: "Sunucu hatası" });
    }

    res.json({ count: results[0].count });
  });
});

// Düzeltilmiş logs endpoint - başlık kullanmayacak, sadece verileri dönecek
app.get("/api/logs", (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const search = req.query.search || "";
  const sortField = req.query.sortField || "timestamp";
  const sortDirection = req.query.sortDirection || "desc";

  // Sayfalama için offset hesapla
  const offset = (page - 1) * limit;

  let query = "SELECT * FROM logs";
  let queryParams = [];

  // Arama filtresi varsa ekle
  if (search) {
    query += ` WHERE 
      id LIKE ? OR
      ip_address LIKE ? OR
      request_method LIKE ? OR
      request_uri LIKE ? OR
      user_agent LIKE ?`;
    const searchParam = `%${search}%`;
    queryParams = [
      searchParam,
      searchParam,
      searchParam,
      searchParam,
      searchParam,
    ];
  }

  // Sıralama ve sayfalama ekle
  query += ` ORDER BY ${connection.escapeId(sortField)} ${
    sortDirection === "asc" ? "ASC" : "DESC"
  }`;
  query += ` LIMIT ? OFFSET ?`;

  queryParams.push(limit, offset);

  connection.query(query, queryParams, (err, results) => {
    if (err) {
      console.error("Logları çekerken hata oluştu: ", err);
      return res.status(500).json({ success: false, message: "Sunucu hatası" });
    }

    // Verileri doğrudan gönder (başlık yok)
    res.json(results || []);
  });
});

app.get("/api/server-stats", (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  const query = `SELECT * FROM sistem_monitor ORDER BY tarih DESC LIMIT ${limit}`;
  connection.query(query, (err, results) => {
    if (err) {
      console.error("Sunucu istatistiklerini çekerken hata oluştu: ", err);
      return res.status(500).json({ success: false, message: "Sunucu hatası" });
    }
    res.json({ success: true, stats: results });
  });
});

app.get("/api/idsLogs", (req, res) => {
  const query = `select * FROM idsLogs`;
  connection.query(query, (err, results) => {
    if (err) {
      console.log("IDS Logları çekilirken hata oluştu: ", err);
      return res
        .status(500)
        .json({ success: false, message: "IDS Logs Çekilemedi." });
    }
    res.json({ success: true, logs: results });
  });
});

app.post("/api/idsLogs/:id/status", (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const query = `UPDATE idsLogs SET checked = ? WHERE id = ?`;
  connection.query(query, [status, id] ,(err, results) => {
    if (err) {
      console.log("IDS log durumu değiştirilirken hata oluştu. ", err);
      return res
        .status(500)
        .json({ success: false, message: "IDS Log durumu değiştirilemedis" });
    }
    res.json({ success: true, message: "Log durumu değiştirildi." });
  });
});

app.listen(port, () => {
  console.log(`Sunucu ${port} portunda dinleniyor...`);
});
