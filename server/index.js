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
import { sendIDSAlertEmail } from "../src/utils/email.js";
const app = express();
const port = process.env.VITE_APP_API_PORT || 5058;

let lastCheckedIDSLogId = 0;
//en son logid tutulacak, daha büyük logid geldiğinde, o alınır ve mail atılır.

const initializeLastCheckedLogId = () => {
  connection.query("SELECT MAX(id) as maxId FROM idsLogs", (err, results) => {
    if (err) {
      console.error("idsLogs dan maxid alınırken hata oluştu:", err);
      return;
    }
    if (results && results[0] && results[0].maxId) {
      lastCheckedIDSLogId = results[0].maxId;
      console.log(
        `Son Kontrol edilen id: ${lastCheckedIDSLogId} (LastCheckedLogId)`
      );
    }
  });
};

const checkNewIDSLogs = () => {
  const query = `SELECT * FROM idsLogs WHERE id > ? ORDER BY id ASC`;

  connection.query(query, [lastCheckedIDSLogId], async (err, results) => {
    if (err) {
      console.error("Yeni IDS Logu kontrol edilirken hata oluştu: ", err);
      return;
    }

    if (results && results.length > 0) {
      console.log(`${results.length} yeni log bulundu.`);

      lastCheckedIDSLogId = Math.max(...results.map((log) => log.id));

      for (const log of results) {
        try {
          const emailSent = await sendIDSAlertEmail(log);
          console.log(`#${log.id} idli log epostaya gönderildi: ${emailSent}`);
        } catch (error) {
          console.error(
            `#${log.id} idli log gönderilirken hata oluştu:`,
            error
          );
        }
      }
    }
  });
};

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
      const updateQuery = `UPDATE users SET son_giris = CURRENT_TIMESTAMP WHERE username = ?`;
      connection.query(updateQuery, [username], (updateErr) => {
        if (updateErr) {
          console.error("Son giriş zamanı güncellenirken hata oluştu: ", updateErr);
        }
      });

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

app.get("/api/users", (req, res) => {
  // const query = `SELECT id, username, email, full_name, role, son_giris FROM users`;
  const query = `SELECT * FROM users`;
  connection.query(query, (err, results) => {
    if (err) {
      console.error("Kullanıcılar çekilirken hata oluştu: ", err);
      return res.status(500).json({ success: false, message: "Sunucu hatası" });
    }
    res.json({ success: true, users: results });
  });
});

app.get("/api/users/:id", (req, res) => {
  const { id } = req.params;
  const query = `SELECT * FROM users WHERE id = ?`;
  connection.query(query, [id], (err, results) => {
    if (err) {
      console.error("Kullanıcı çekilirken hata oluştu: ", err);
      return res.status(500).json({ success: false, message: "Sunucu hatası" });
    }
    
    if (results.length > 0) {
      res.json({ success: true, user: results[0] });
    } else {
      res.status(404).json({ success: false, message: "Kullanıcı bulunamadı" });
    }
  });
});

// Profil güncelleme endpoint'i
app.put("/api/users/:id", (req, res) => {
  const { id } = req.params;
  const { username, email, full_name, role, password } = req.body;
  
  let query, params;
  
  if (password) {
    query = `UPDATE users SET username = ?, email = ?, full_name = ?, password = ? WHERE id = ?`;
    params = [username, email, full_name, password, id];
  } else {
    query = `UPDATE users SET username = ?, email = ?, full_name = ?, WHERE id = ?`;
    params = [username, email, full_name, id];
  }
  
  connection.query(query, params, (err, results) => {
    if (err) {
      console.error("Profil güncellenirken hata oluştu: ", err);
      return res.status(500).json({ success: false, message: "Sunucu hatası" });
    }
    
    res.json({ success: true, message: "Profil başarıyla güncellendi" });
  });
});

// Yeni profil oluşturma endpoint
app.post("/api/users", (req, res) => {
  const { username, email, full_name, role, password } = req.body;
  
  const query = `INSERT INTO users (username, email, full_name, password, olusturulma) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`;
  connection.query(query, [username, email, full_name, password], (err, results) => {
    if (err) {
      console.error("Profil eklenirken hata oluştu: ", err);
      return res.status(500).json({ success: false, message: "Sunucu hatası" });
    }
    
    res.json({ success: true, message: "Profil başarıyla oluşturuldu", id: results.insertId });
  });
});

// Kullanıcı silme endpoint'i
app.delete("/api/users/:id", (req, res) => {
  const { id } = req.params;

  const query = `DELETE FROM users WHERE id = ?`;
  connection.query(query, [id], (err, results) => {
    if (err) {
      console.error("Kullanıcı silinirken hata oluştu: ", err);
      return res.status(500).json({ success: false, message: "Sunucu hatası" });
    }
    
    if (results.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Kullanıcı bulunamadı" });
    }
    
    res.json({ success: true, message: "Kullanıcı başarıyla silindi" });
  });
});

app.get("/api/logs-count", (req, res) => {
  const search = req.query.search || "";

  let countQuery = "SELECT COUNT(*) as count FROM logs";
  let queryParams = [];

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

app.get("/api/logs", (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const search = req.query.search || "";
  const sortField = req.query.sortField || "timestamp";
  const sortDirection = req.query.sortDirection || "desc";

  const offset = (page - 1) * limit;

  let query = "SELECT * FROM logs";
  let queryParams = [];

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
app.post("/api/send-test-email", async (req, res) => {
  try {
    const testLog = {
      id: 1,
      timestamp: new Date().toISOString(),
      ip_address: "192.168.1.1",
      request_uri: "/admin/config?id=1' OR '1'='1",
      attack_type: "TEST",
      status_code: 403,
      user_agent:
        "Test E-Posta",
    };

    const emailSent = await sendIDSAlertEmail(testLog);

    if (emailSent) {
      res.json({
        success: true,
        message: "Test e-postası başarıyla gönderildi.",
      });
    } else {
      res.json({
        success: false,
        message: "E-posta gönderilemedi, lütfen logları kontrol edin!",
      });
    }
  } catch (error) {
    const message = "E-posta gönderilirken bir hata oluştu: " + error.message;
    console.error(message);
    res.status(500).json({
      success: false,
      message,
    });
  }
});

app.get("/api/idsLogs", (req, res) => {
  const query = `select * FROM idsLogs`;
  connection.query(query, (err, results) => {
    if (err) {
      const message = "IDS logları çekilirken hata oluştu " + err.message;
      console.log(message);
      return res.status(500).json({ success: false, message });
    }
    res.json({ success: true, logs: results });
  });
});

app.delete("/api/idsLogs/:id", (req, res) => {
  const { id } = req.params;

  const query = `DELETE FROM idsLogs WHERE id = ?`;
  connection.query(query, [id], (err, results) => {
    if (err) {
      const message = "IDS logu silinirken hata oluştu." + err.message;
      console.log(message);
      return res.status(500).json({ success: false, message });
    }
    res.json({ success: true, message: "Log silindi." });
  });
});

app.post("/api/idsLogs/:id/status", (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const query = `UPDATE idsLogs SET checked = ? WHERE id = ?`;
  connection.query(query, [status, id], (err, results) => {
    if (err) {
      const message =
        "IDS log durumu değiştirilirken hata oluştu." + err.message;
      console.log(message);
      return res.status(500).json({ success: false, message });
    }
    res.json({ success: true, message: "Log durumu değiştirildi." });
  });
});

initializeLastCheckedLogId();

//ids logu geldiğinde mail göndermek için, yarım dakikada bir kontrol.
setInterval(checkNewIDSLogs, 30000);
app.listen(port, () => {
  console.log(`Sunucu ${port} portunda dinleniyor...`);
});
