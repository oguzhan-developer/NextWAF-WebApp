import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import crypto from "crypto"; // Şifreleme için crypto modülünü ekle

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, "../.env") });
import connection from "./db.js";
import { sendIDSAlertEmail, sendSystemAlertEmail } from "../src/utils/email.js";
const app = express();
const port = process.env.VITE_APP_API_PORT || 5058;

// Parola şifreleme fonksiyonu
const hashPassword = (password) => {
  return crypto.createHash('sha256').update(password).digest('hex');
};

let lastCheckedIDSLogId = 0;
let lastResourceAlertTime = {};
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

const checkSystemResources = async () => {
  try {
    console.log("Sistem kaynakları kontrol ediliyor:", new Date().toISOString());
    const query = "SELECT * FROM sistem_monitor ORDER BY tarih DESC LIMIT 1";
    connection.query(query, async (err, results) => {
      if (err) {
        console.error("Sistem kaynak bilgisi kontrol edilirken hata oluştu: ", err);
        return;
      }

      console.log("Sistem monitör sonuçları:", results);
      
      if (results && results.length > 0) {
        const latestStat = results[0];
        console.log("En son sistem durumu:", latestStat);
        
        // Veritabanındaki doğru alan adlarını kullan
        const cpuUsage = latestStat.CPUYuzdesi || 0;
        const ramUsage = latestStat.RAMYuzdesi || 0;
        const diskUsage = latestStat.diskYuzdesi || 0;

        console.log(`Mevcut kullanım - CPU: ${cpuUsage}%, RAM: ${ramUsage}%, Disk: ${diskUsage}%`);

        // Kritik eşik - eşik düşürüldü daha kolay test edebilmek için
        const CRITICAL_THRESHOLD = 65;
        
        const now = Date.now();
        const MIN_ALERT_INTERVAL = 10 * 60 * 1000; // 10 dakika
        
        const alerts = [];
        
        if (cpuUsage > CRITICAL_THRESHOLD && 
            (!lastResourceAlertTime.cpu || now - lastResourceAlertTime.cpu > MIN_ALERT_INTERVAL)) {
          alerts.push({resource: 'CPU', usage: cpuUsage});
          lastResourceAlertTime.cpu = now;
          console.log(`CPU kullanımı kritik seviyede: ${cpuUsage}%`);
        }
        
        if (ramUsage > CRITICAL_THRESHOLD && 
            (!lastResourceAlertTime.ram || now - lastResourceAlertTime.ram > MIN_ALERT_INTERVAL)) {
          alerts.push({resource: 'RAM', usage: ramUsage});
          lastResourceAlertTime.ram = now;
          console.log(`RAM kullanımı kritik seviyede: ${ramUsage}%`);
        }
        
        if (diskUsage > CRITICAL_THRESHOLD && 
            (!lastResourceAlertTime.disk || now - lastResourceAlertTime.disk > MIN_ALERT_INTERVAL)) {
          alerts.push({resource: 'Disk', usage: diskUsage});
          lastResourceAlertTime.disk = now;
          console.log(`Disk kullanımı kritik seviyede: ${diskUsage}%`);
        }
        
        console.log("Oluşturulan uyarılar:", alerts);
        
        if (alerts.length > 0) {
          console.log("Uyarılar bulundu, e-posta gönderiliyor...");
          try {
            const alertSent = await sendSystemAlertEmail(alerts, latestStat);
            
            if (alertSent) {
              console.log(`${alerts.map(a => a.resource).join(', ')} kaynak uyarı e-postası gönderildi`);
            } else {
              console.error("Kaynak uyarı e-postası gönderilemedi");
            }
          } catch (emailError) {
            console.error("E-posta gönderimi sırasında hata:", emailError);
          }
        } else {
          console.log("Kritik kaynak kullanımı yok, uyarı gönderilmedi.");
        }
      } else {
        console.log("Sistem kaynak verileri bulunamadı.");
      }
    });
  } catch (error) {
    console.error("Sistem kaynakları kontrolü sırasında hata:", error);
  }
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

  const hashedPassword = hashPassword(password);
  
  const query = `select * from users where username = ? and password = ?`;
  connection.query(query, [username, hashedPassword], (err, results) => {
    if (err) {
      console.error("Sorgu sırasında hata oluştu: ", err);
      return res.status(500).json({ success: false, message: "Sunucu hatası" });
    }

    if (results.length > 0) {
      // Son giriş zamanını güncelle ve kullanıcıyı aktif olarak işaretle
      const updateQuery = `UPDATE users SET son_giris = CURRENT_TIMESTAMP, active = 1 WHERE username = ?`;
      connection.query(updateQuery, [username], (updateErr) => {
        if (updateErr) {
          console.error("Kullanıcı durumu güncellenirken hata oluştu: ", updateErr);
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
    // Parolayı şifrele
    const hashedPassword = hashPassword(password);
    
    query = `UPDATE users SET username = ?, email = ?, full_name = ?, password = ? WHERE id = ?`;
    params = [username, email, full_name, hashedPassword, id];
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
  
  // Parolayı şifrele
  const hashedPassword = hashPassword(password);
  
  const query = `INSERT INTO users (username, email, full_name, password, olusturulma) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`;
  connection.query(query, [username, email, full_name, hashedPassword], (err, results) => {
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

app.get("/api/latest-system-stats", (req, res) => {
  const query = "SELECT * FROM sistem_monitor ORDER BY tarih DESC LIMIT 1";
  connection.query(query, (err, results) => {
    if (err) {
      console.error("Son sistem durumu çekilirken hata oluştu: ", err);
      return res.status(500).json({ success: false, message: "Sunucu hatası" });
    }
    res.json({ success: true, stats: results[0] || {} });
  });
});

// Test amacıyla sistemi zorlayarak bir uyarı e-postası gönderen endpoint
app.get("/api/force-check-resources", async (req, res) => {
  try {
    console.log("Sistem uyarı e-postası zorla isteği alındı");
    
    // Sistem istatistiklerini çek
    const query = "SELECT * FROM sistem_monitor ORDER BY tarih DESC LIMIT 1";
    connection.query(query, async (err, results) => {
      if (err) {
        return res.status(500).json({ 
          success: false, 
          message: "Sistem istatistikleri alınamadı: " + err.message 
        });
      }
      
      if (!results || results.length === 0) {
        return res.status(404).json({ 
          success: false, 
          message: "Sistem istatistikleri bulunamadı" 
        });
      }
      
      // Sistemde zorla %85 üzerinde kullanım olduğu varsayımını yapacağız
      const latestStat = results[0];
      const fakeStats = {
        ...latestStat,
        CPUYuzdesi: Math.max(latestStat.CPUYuzdesi || 0, 85), // En az %85
        RAMYuzdesi: Math.max(latestStat.RAMYuzdesi || 0, 85), // En az %85
        diskYuzdesi: Math.max(latestStat.diskYuzdesi || 0, 85) // En az %85
      };
      
      const alerts = [
        {resource: 'CPU', usage: fakeStats.CPUYuzdesi},
        {resource: 'RAM', usage: fakeStats.RAMYuzdesi},
        {resource: 'Disk', usage: fakeStats.diskYuzdesi}
      ];
      
      // E-posta gönder
      const alertSent = await sendSystemAlertEmail(alerts, fakeStats);
      
      if (alertSent) {
        res.json({
          success: true,
          message: "Test uyarı e-postası başarıyla gönderildi"
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Uyarı e-postası gönderilemedi"
        });
      }
    });
  } catch (error) {
    console.error("Test uyarı e-postası gönderilirken hata:", error);
    res.status(500).json({
      success: false,
      message: `Hata: ${error.message}`
    });
  }
});

initializeLastCheckedLogId();

// Başlangıçta bir kez çalıştır
console.log("İlk sistem kaynakları kontrolü planlanıyor...");
setTimeout(() => {
  console.log("İlk sistem kaynakları kontrolü yapılıyor...");
  checkSystemResources();
}, 5000);

// Ardından düzenli aralıklarla kontrol et
const interval = 60 * 1000; // 1 dakika
console.log(`Sistem kaynakları ${interval/1000} saniyede bir kontrol edilecek`);
setInterval(checkSystemResources, interval);

//ids logu geldiğinde mail göndermek için, yarım dakikada bir kontrol.
setInterval(checkNewIDSLogs, 30000);

app.listen(port, () => {
  console.log(`Sunucu ${port} portunda dinleniyor...`);
});
