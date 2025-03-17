import nodemailer from "nodemailer";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, "../../.env") });

// SMTP ayarlarını kontrol et ve logla
console.log("===== SMTP Yapılandırması =====");
console.log(`Host: ${process.env.SMTP_HOST || "smtp.gmail.com"}`);
console.log(`Port: ${process.env.SMTP_PORT || 587}`);
console.log(`Secure: ${process.env.SMTP_SECURE === "true"}`);
console.log(`User: ${process.env.SMTP_USER ? "Tanımlı" : "Tanımlı değil"}`);
console.log(`Password: ${process.env.SMTP_PASSWORD ? "Tanımlı" : "Tanımlı değil"}`);
console.log(`Alert Email: ${process.env.ALERT_EMAIL || "Tanımlı değil (Varsayılan olarak oguzhanylcn@mail.com kullanılacak)"}`);

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: process.env.SMTP_PORT || 587,
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

// Transporter doğrulama
transporter.verify()
  .then(() => console.log("SMTP bağlantısı başarılı!"))
  .catch(err => console.error("SMTP bağlantısı başarısız:", err));

export async function sendIDSAlertEmail(log) {
  // Tarih nesnesi oluşturup Türkçe formatında biçimlendirme
  const date = new Date(log.timestamp);
  const attackDate = new Intl.DateTimeFormat('tr-TR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(date);
  
  const mailOptions = {
    from: `"NextWAF Güvenlik" <${process.env.SMTP_USER}>`,
    to: process.env.ALERT_EMAIL || "oguzhanylcn@mail.com",
    subject: `🚨 Güvenlik Uyarısı: ${log.attack_type} Saldırısı Tespit Edildi! (#${log.id})`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 5px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #db2828; margin: 0;">Güvenlik Uyarısı #${log.id}</h1>
          <p style="color: #777;">NextWAF Güvenlik Sistemi</p>
        </div>
        
        <div style="background-color: #f8f8f9; border-left: 4px solid #db2828; padding: 15px; margin-bottom: 20px;">
          <p style="margin: 0; font-size: 16px;"><strong>${log.attack_type}</strong> saldırı girişimi tespit edildi.</p>
        </div>
        
        <h2 style="color: #444; border-bottom: 1px solid #eee; padding-bottom: 10px;">Saldırı Detayları</h2>
        
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold; width: 40%;">Log ID:</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${log.id}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold; width: 40%;">Saldırı Tipi:</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${log.attack_type}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Tarih:</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${attackDate}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">IP Adresi:</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${log.ip_address}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">İstek URL:</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee; word-break: break-all;">${log.request_uri}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Durum Kodu:</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${log.status_code}</td>
          </tr>
        </table>
        
        <div style="margin-top: 30px; text-align: center; color: #777; font-size: 14px;">
          <p>Bu e-posta NextWAF güvenlik sistemi tarafından otomatik olarak gönderilmiştir.</p>
          <p>Lütfen yönetici panelinden saldırı detaylarını inceleyiniz.</p>
        </div>
      </div>
    `,
  };

  try {
    console.log(`IDS uyarı e-postası gönderiliyor... Alıcı: ${mailOptions.to}`);
    const info = await transporter.sendMail(mailOptions);
    console.log(`E-posta gönderildi: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error("E-posta gönderilirken hata oluştu:", error);
    return false;
  }
}

export async function sendSystemAlertEmail(alerts, systemStats) {
  const date = new Date();
  const alertDate = new Intl.DateTimeFormat('tr-TR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(date);
  
  console.log("Sistem uyarı e-postası hazırlanıyor...");
  console.log("Uyarılar:", JSON.stringify(alerts));
  console.log("Sistem durumu:", JSON.stringify(systemStats));
  
  // Uyarı türleri için metin oluşturma
  const alertTypesText = alerts.map(a => {
    const usage = typeof a.usage === 'number' ? a.usage.toFixed(1) : a.usage;
    return `${a.resource}: %${usage}`;
  }).join(', ');
  
  // CPU, RAM ve Disk kullanım değerlerini doğru alanlardan alın
  const cpuUsage = systemStats.CPUYuzdesi;
  const ramUsage = systemStats.RAMYuzdesi;
  const diskUsage = systemStats.diskYuzdesi;

  console.log(`Email için düzeltilmiş değerler - CPU: ${cpuUsage}, RAM: ${ramUsage}, Disk: ${diskUsage}`);
  
  const mailOptions = {
    from: `"NextWAF Sistem Monitör" <${process.env.SMTP_USER}>`,
    to: process.env.ALERT_EMAIL || "oguzhanylcn@mail.com",
    subject: `⚠️ Sistem Kaynak Uyarısı: ${alertTypesText}`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 5px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #f2711c; margin: 0;">Sistem Kaynak Uyarısı</h1>
          <p style="color: #777;">NextWAF Sistem Monitör</p>
        </div>
        
        <div style="background-color: #fff8f0; border-left: 4px solid #f2711c; padding: 15px; margin-bottom: 20px;">
          <p style="margin: 0; font-size: 16px;">Sunucunuzun sistem kaynakları kritik seviyeye ulaştı!</p>
        </div>
        
        <h2 style="color: #444; border-bottom: 1px solid #eee; padding-bottom: 10px;">Kaynak Kullanım Detayları</h2>
        
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold; width: 40%;">Tarih:</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${alertDate}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold; width: 40%;">CPU Kullanımı:</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee; ${cpuUsage > 80 ? 'color: #db2828; font-weight: bold;' : ''}">${cpuUsage}%</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">RAM Kullanımı:</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee; ${ramUsage > 80 ? 'color: #db2828; font-weight: bold;' : ''}">${ramUsage}%</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Disk Kullanımı:</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee; ${diskUsage > 80 ? 'color: #db2828; font-weight: bold;' : ''}">${diskUsage}%</td>
          </tr>
        </table>
        
        <div style="background-color: #f8f8f9; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
          <p style="margin: 0; color: #555;">
            <strong>Dikkat:</strong> %80 veya üzeri kaynak kullanımı sistem performansını ve güvenliğini etkileyebilir. 
            Lütfen gerekli önlemleri alın.
          </p>
        </div>
        
        <div style="margin-top: 30px; text-align: center; color: #777; font-size: 14px;">
          <p>Bu e-posta NextWAF sistem monitör tarafından otomatik olarak gönderilmiştir.</p>
        </div>
      </div>
    `,
  };

  try {
    console.log("Sistem uyarı e-postası gönderiliyor...");
    console.log("Alıcı:", mailOptions.to);
    const info = await transporter.sendMail(mailOptions);
    console.log(`Sistem uyarı e-postası gönderildi: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error("Sistem uyarı e-postası gönderilirken hata oluştu:", error);
    return false;
  }
}

export async function testEmailConnection() {
  try {
    await transporter.verify();
    return { success: true, message: "E-posta bağlantısı başarılı" };
  } catch (error) {
    return {
      success: false,
      message: `E-posta bağlantı hatası: ${error.message}`,
    };
  }
}

// Test e-postası gönderme fonksiyonu
export async function sendTestEmail(subject = "NextWAF Test E-postası") {
  const mailOptions = {
    from: `"NextWAF Test" <${process.env.SMTP_USER}>`,
    to: process.env.ALERT_EMAIL || "oguzhanylcn@mail.com",
    subject: subject,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 5px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #21ba45; margin: 0;">Test E-postası</h1>
          <p style="color: #777;">NextWAF E-posta Sistemi</p>
        </div>
        
        <div style="background-color: #f8f8f9; border-left: 4px solid #21ba45; padding: 15px; margin-bottom: 20px;">
          <p style="margin: 0; font-size: 16px;">Bu bir test e-postasıdır. E-posta sisteminin düzgün çalıştığını gösterir.</p>
        </div>
        
        <div style="margin-top: 30px; text-align: center; color: #777; font-size: 14px;">
          <p>Bu e-posta NextWAF test sistemi tarafından gönderilmiştir.</p>
          <p>Gönderim zamanı: ${new Date().toLocaleString('tr-TR')}</p>
        </div>
      </div>
    `
  };

  try {
    console.log("Test e-postası gönderiliyor...");
    const info = await transporter.sendMail(mailOptions);
    console.log(`Test e-postası gönderildi: ${info.messageId}`);
    return { success: true, message: "Test e-postası başarıyla gönderildi", messageId: info.messageId };
  } catch (error) {
    console.error("Test e-postası gönderilirken hata oluştu:", error);
    return { success: false, message: `E-posta gönderme hatası: ${error.message}`, error };
  }
}
