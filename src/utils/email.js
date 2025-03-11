import nodemailer from "nodemailer";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, "../../.env") });

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: process.env.SMTP_PORT || 587,
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

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
    const info = await transporter.sendMail(mailOptions);
    console.log(`E-posta gönderildi: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error("E-posta gönderilirken hata oluştu:", error);
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
