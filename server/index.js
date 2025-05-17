import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import crypto from "crypto";
import axios from "axios";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, "../.env") });
import connection from "./db.js";
import { sendIDSAlertEmail, sendSystemAlertEmail } from "../src/utils/email.js";
const app = express();
const port = process.env.VITE_APP_API_PORT || 5058;

const system_ip = process.env.VITE_APP_CMD_API_IP || "172.17.0.1";
const system_port = process.env.VITE_APP_SYSTEM_PORT || "8080";

const hashPassword = (password) => {
  return crypto.createHash("sha256").update(password).digest("hex");
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
    console.log(
      "Sistem kaynakları kontrol ediliyor:",
      new Date().toISOString()
    );
    const query = "SELECT * FROM sistem_monitor ORDER BY tarih DESC LIMIT 1";
    connection.query(query, async (err, results) => {
      if (err) {
        console.error(
          "Sistem kaynak bilgisi kontrol edilirken hata oluştu: ",
          err
        );
        return;
      }

      console.log("Sistem monitör sonuçları:", results);

      if (results && results.length > 0) {
        const latestStat = results[0];
        console.log("En son sistem durumu:", latestStat);

        const cpuUsage = latestStat.CPUYuzdesi || 0;
        const ramUsage = latestStat.RAMYuzdesi || 0;
        const diskUsage = latestStat.diskYuzdesi || 0;

        console.log(
          `Mevcut kullanım - CPU: ${cpuUsage}%, RAM: ${ramUsage}%, Disk: ${diskUsage}%`
        );

        const CRITICAL_THRESHOLD = 65;

        const now = Date.now();
        const MIN_ALERT_INTERVAL = 10 * 60 * 1000;

        const alerts = [];

        if (
          cpuUsage > CRITICAL_THRESHOLD &&
          (!lastResourceAlertTime.cpu ||
            now - lastResourceAlertTime.cpu > MIN_ALERT_INTERVAL)
        ) {
          alerts.push({ resource: "CPU", usage: cpuUsage });
          lastResourceAlertTime.cpu = now;
          console.log(`CPU kullanımı kritik seviyede: ${cpuUsage}%`);
        }

        if (
          ramUsage > CRITICAL_THRESHOLD &&
          (!lastResourceAlertTime.ram ||
            now - lastResourceAlertTime.ram > MIN_ALERT_INTERVAL)
        ) {
          alerts.push({ resource: "RAM", usage: ramUsage });
          lastResourceAlertTime.ram = now;
          console.log(`RAM kullanımı kritik seviyede: ${ramUsage}%`);
        }

        if (
          diskUsage > CRITICAL_THRESHOLD &&
          (!lastResourceAlertTime.disk ||
            now - lastResourceAlertTime.disk > MIN_ALERT_INTERVAL)
        ) {
          alerts.push({ resource: "Disk", usage: diskUsage });
          lastResourceAlertTime.disk = now;
          console.log(`Disk kullanımı kritik seviyede: ${diskUsage}%`);
        }

        console.log("Oluşturulan uyarılar:", alerts);

        if (alerts.length > 0) {
          console.log("Uyarılar bulundu, e-posta gönderiliyor...");
          try {
            const alertSent = await sendSystemAlertEmail(alerts, latestStat);

            if (alertSent) {
              console.log(
                `${alerts
                  .map((a) => a.resource)
                  .join(", ")} kaynak uyarı e-postası gönderildi`
              );
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
      const updateQuery = `UPDATE users SET son_giris = CURRENT_TIMESTAMP, active = 1 WHERE username = ?`;
      connection.query(updateQuery, [username], (updateErr) => {
        if (updateErr) {
          console.error(
            "Kullanıcı durumu güncellenirken hata oluştu: ",
            updateErr
          );
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

app.put("/api/users/:id", (req, res) => {
  const { id } = req.params;
  const { username, email, full_name, role, password } = req.body;

  let query, params;

  if (password) {
    const hashedPassword = hashPassword(password);

    query = `UPDATE users SET username = ?, email = ?, full_name = ?, password = ? WHERE id = ?`;
    params = [username, email, full_name, hashedPassword, id];
  } else {
    query = `UPDATE users SET username = ?, email = ?, full_name = ? WHERE id = ?`;
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

app.post("/api/users", (req, res) => {
  const { username, email, full_name, role, password } = req.body;

  const hashedPassword = hashPassword(password);

  const query = `INSERT INTO users (username, email, full_name, password, olusturulma) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`;
  connection.query(
    query,
    [username, email, full_name, hashedPassword],
    (err, results) => {
      if (err) {
        console.error("Profil eklenirken hata oluştu: ", err);
        return res
          .status(500)
          .json({ success: false, message: "Sunucu hatası" });
      }

      res.json({
        success: true,
        message: "Profil başarıyla oluşturuldu",
        id: results.insertId,
      });
    }
  );
});

app.delete("/api/users/:id", (req, res) => {
  const { id } = req.params;

  const query = `DELETE FROM users WHERE id = ?`;
  connection.query(query, [id], (err, results) => {
    if (err) {
      console.error("Kullanıcı silinirken hata oluştu: ", err);
      return res.status(500).json({ success: false, message: "Sunucu hatası" });
    }

    if (results.affectedRows === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Kullanıcı bulunamadı" });
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
      user_agent: "Test E-Posta",
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

app.get("/api/force-check-resources", async (req, res) => {
  try {
    console.log("Sistem uyarı e-postası zorla isteği alındı");

    const query = "SELECT * FROM sistem_monitor ORDER BY tarih DESC LIMIT 1";
    connection.query(query, async (err, results) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: "Sistem istatistikleri alınamadı: " + err.message,
        });
      }

      if (!results || results.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Sistem istatistikleri bulunamadı",
        });
      }

      const latestStat = results[0];
      const fakeStats = {
        ...latestStat,
        CPUYuzdesi: Math.max(latestStat.CPUYuzdesi || 0, 85),
        RAMYuzdesi: Math.max(latestStat.RAMYuzdesi || 0, 85),
        diskYuzdesi: Math.max(latestStat.diskYuzdesi || 0, 85),
      };

      const alerts = [
        { resource: "CPU", usage: fakeStats.CPUYuzdesi },
        { resource: "RAM", usage: fakeStats.RAMYuzdesi },
        { resource: "Disk", usage: fakeStats.diskYuzdesi },
      ];

      const alertSent = await sendSystemAlertEmail(alerts, fakeStats);

      if (alertSent) {
        res.json({
          success: true,
          message: "Test uyarı e-postası başarıyla gönderildi",
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Uyarı e-postası gönderilemedi",
        });
      }
    });
  } catch (error) {
    console.error("Test uyarı e-postası gönderilirken hata:", error);
    res.status(500).json({
      success: false,
      message: `Hata: ${error.message}`,
    });
  }
});

app.get("/api/blocked-ips", (req, res) => {
  const query = "SELECT * FROM blocked_ips ORDER BY blocked_date DESC";

  connection.query(query, (err, results) => {
    if (err) {
      console.error("Engellenen IP'ler alınırken hata oluştu:", err);
      return res.status(500).json({
        success: false,
        message: "Engellenen IP'ler alınırken bir hata oluştu.",
      });
    }

    res.json({
      success: true,
      ips: results || [],
    });
  });
});

app.post("/api/block-ip", (req, res) => {
  const { ip, reason } = req.body;

  if (!ip) {
    return res.status(400).json({
      success: false,
      message: "IP adresi belirtilmelidir.",
    });
  }

  const ipRegex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  if (!ipRegex.test(ip)) {
    return res.status(400).json({
      success: false,
      message: "Geçersiz IP adresi formatı.",
    });
  }

  const checkQuery = "SELECT * FROM blocked_ips WHERE address = ?";
  connection.query(checkQuery, [ip], (checkErr, checkResults) => {
    if (checkErr) {
      console.error("IP kontrolünde hata:", checkErr);
      return res.status(500).json({
        success: false,
        message: "Sunucu hatası",
      });
    }

    if (checkResults && checkResults.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Bu IP adresi zaten engellenmiş durumda.",
      });
    }

    const insertQuery =
      "INSERT INTO blocked_ips (address, reason, blocked_date) VALUES (?, ?, NOW())";
    connection.query(
      insertQuery,
      [ip, reason || "Manuel olarak engellendi"],
      async (insertErr) => {
        if (insertErr) {
          console.error("IP engellenirken hata:", insertErr);
          return res.status(500).json({
            success: false,
            message: "IP engellenirken bir hata oluştu.",
          });
        }

        try {
          const command = `sudo iptables -A INPUT -s ${ip} -j DROP`;
          console.log("Çalıştırılan komut:", command);

          const response = await axios.get(
            `http://${system_ip}:${system_port}/cmd.php`,
            {
              params: {
                command: command,
              },
              timeout: 5000,
            }
          );

          console.log("Firewall komutu yanıtı:", response.data);

          res.json({
            success: true,
            message: `${ip} adresi başarıyla engellendi.`,
          });
        } catch (error) {
          console.error("Firewall komutu çalıştırılırken hata:", error);

          res.json({
            success: true,
            message: `${ip} adresi veritabanında engellendi.`,
            warning:
              "Firewall güncellenemedi. Lütfen sistem yöneticinize başvurun.",
          });
        }
      }
    );
  });
});

app.delete("/api/blocked-ips/:ip", (req, res) => {
  const { ip } = req.params;

  if (!ip) {
    return res.status(400).json({
      success: false,
      message: "IP adresi belirtilmelidir.",
    });
  }

  const deleteQuery = "DELETE FROM blocked_ips WHERE address = ?";
  connection.query(deleteQuery, [ip], async (deleteErr, results) => {
    if (deleteErr) {
      console.error("IP engeli kaldırılırken hata:", deleteErr);
      return res.status(500).json({
        success: false,
        message: "IP engeli kaldırılırken bir hata oluştu.",
      });
    }

    if (results.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Belirtilen IP adresi engellenenler listesinde bulunamadı.",
      });
    }

    try {
      const command = `sudo iptables -D INPUT -s ${ip} -j DROP`;
      console.log("Çalıştırılan komut:", command);

      const response = await axios.get(
        `http://${system_ip}:${system_port}/cmd.php`,
        {
          params: {
            command: command,
          },
          timeout: 5000,
        }
      );

      console.log("Firewall komutu yanıtı:", response.data);

      res.json({
        success: true,
        message: `${ip} adresi için engelleme kaldırıldı.`,
      });
    } catch (error) {
      console.error("Firewall komutu çalıştırılırken hata:", error);

      res.json({
        success: true,
        message: `${ip} adresi veritabanından kaldırıldı.`,
        warning:
          "Firewall güncellemesi yapılamadı. Lütfen sistem yöneticinize başvurun.",
      });
    }
  });
});

app.post("/api/block-attack-source", async (req, res) => {
  const { logId } = req.body;

  if (!logId) {
    return res.status(400).json({
      success: false,
      message: "Log ID belirtilmelidir.",
    });
  }

  const logQuery = "SELECT * FROM idsLogs WHERE id = ?";
  connection.query(logQuery, [logId], async (logErr, logs) => {
    if (logErr || !logs || logs.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Belirtilen log kaydı bulunamadı.",
      });
    }

    const log = logs[0];
    const ipAddress = log.ip_address;
    const reason = `${log.attack_type} saldırısı nedeniyle otomatik engellendi (Log ID: ${log.id})`;

    const checkQuery = "SELECT * FROM blocked_ips WHERE address = ?";
    connection.query(checkQuery, [ipAddress], (checkErr, checkResults) => {
      if (checkErr) {
        return res.status(500).json({
          success: false,
          message: "Sunucu hatası",
        });
      }

      if (checkResults && checkResults.length > 0) {
        return res.json({
          success: false,
          message: "Bu IP adresi zaten engellenmiş durumda.",
        });
      }

      const insertQuery =
        "INSERT INTO blocked_ips (address, reason, blocked_date) VALUES (?, ?, NOW())";
      connection.query(insertQuery, [ipAddress, reason], async (insertErr) => {
        if (insertErr) {
          return res.status(500).json({
            success: false,
            message: "IP engellenirken bir hata oluştu.",
          });
        }

        try {
          const updateQuery = "UPDATE idsLogs SET checked = ? WHERE id = ?";
          connection.query(updateQuery, [1, logId]);

          const command = `sudo iptables -A INPUT -s ${ipAddress} -j DROP`;

          const response = await axios.get(
            `http://${system_ip}:${system_port}/cmd.php`,
            {
              params: {
                command: command,
              },
              timeout: 5000,
            }
          );

          res.json({
            success: true,
            message: `${ipAddress} adresi başarıyla engellendi ve log işaretlendi.`,
          });
        } catch (error) {
          console.error("Firewall komutu çalıştırılırken hata:", error);

          res.json({
            success: true,
            message: `${ipAddress} adresi veritabanında engellendi ve log işaretlendi.`,
            warning: "Firewall güncellenemedi.",
          });
        }
      });
    });
  });
});

const ABUSE_IPDB_API_KEY =
  process.env.ABUSE_IPDB_API_KEY ||
  "560295a57ef16781f161d3b9e5417603209295ed4552f13152dcd4a91b16427e91605a9bf69e3f61";

app.get("/api/check-ip-reputation", async (req, res) => {
  const { ip } = req.query;

  if (!ip) {
    return res.status(400).json({
      success: false,
      message: "IP adresi belirtilmelidir.",
    });
  }

  try {
    console.log(`IP itibar kontrolü yapılıyor: ${ip}`);

    const abuseResponse = await axios.get(
      "https://api.abuseipdb.com/api/v2/check",
      {
        params: {
          ipAddress: ip,
          maxAgeInDays: 90,
          verbose: true,
        },
        headers: {
          Key: ABUSE_IPDB_API_KEY,
          Accept: "application/json",
        },
        timeout: 10000,
      }
    );

    console.log("AbuseIPDB yanıt durumu:", abuseResponse.status);
    console.log("responsee:", abuseResponse);

    const combinedData = {
      abuse: abuseResponse.data.data,
// Başka gelirse diye orn. geo
    };

    res.json({
      success: true,
      ...combinedData,
    });
  } catch (error) {
    console.error("IP itibar bilgileri alınırken hata oluştu:", error.message);

    if (error.response) {
      console.error("API yanıt detayları:", {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
      });
    }

    let errorMessage = "IP itibar bilgileri alınırken bir hata oluştu";

    if (error.response) {
      if (error.response.data && error.response.data.errors) {
        errorMessage = `API hatası: ${error.response.data.errors.join(", ")}`;
      } else {
        errorMessage = `API yanıt hatası: ${error.response.status} - ${error.response.statusText}`;
      }
    } else if (error.request) {
      errorMessage = `API isteği yapıldı ama yanıt alınamadı: ${error.message}`;
    } else {
      errorMessage = `İstek oluşturulurken hata: ${error.message}`;
    }

    res.status(500).json({
      success: false,
      message: errorMessage,
    });
  }
});

app.post("/api/logout", (req, res) => {
  const { username } = req.body;

  if (!username) {
    return res.status(400).json({
      success: false,
      message: "Kullanıcı adı belirtilmelidir.",
    });
  }

  const query = `UPDATE users SET active = 0 WHERE username = ?`;

  connection.query(query, [username], (err, results) => {
    if (err) {
      console.error("Çıkış işlemi sırasında hata oluştu: ", err);
      return res.status(500).json({ success: false, message: "Sunucu hatası" });
    }

    if (results.affectedRows === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Kullanıcı bulunamadı" });
    }

    res.json({ success: true, message: "Başarıyla çıkış yapıldı" });
  });
});

app.get("/api/active-users", (req, res) => {
  const query = `SELECT id, username, email, full_name, son_giris FROM users WHERE active = 1`;

  connection.query(query, (err, results) => {
    if (err) {
      console.error("Aktif kullanıcılar çekilirken hata oluştu: ", err);
      return res.status(500).json({ success: false, message: "Sunucu hatası" });
    }

    res.json({
      success: true,
      users: results || [],
    });
  });
});

initializeLastCheckedLogId();

console.log("İlk sistem kaynakları kontrolü planlanıyor...");
setTimeout(() => {// Ardından düzenli aralıklarla kontrol et

  console.log("İlk sistem  // 1 dakikakaynakları kontrolü yapılıyor...");
  checkSystemResources();
}, 5000);

// Ardından düzenli aralıklarla kontrol et
const interval = 60 * 1000; // 1 dakika
console.log(
  `Sistem kaynakları ${interval / 1000} saniyede bir kontrol edilecek`
);
setInterval(checkSystemResources, interval);

//ids logu geldiğinde mail göndermek için, yarım dakikada bir kontrol.
setInterval(checkNewIDSLogs, 30000);

app.listen(port, () => {
  console.log(`Sunucu ${port} portunda dinleniyor...`);
});
