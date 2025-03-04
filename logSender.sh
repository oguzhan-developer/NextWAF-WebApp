#!/bin/bash

# MySQL/MariaDB Bağlantı Bilgileri
MYSQL_USER="admin"
MYSQL_PASSWORD="rootroot"
MYSQL_HOST="10.211.55.5"
MYSQL_DB="NextWAF"
MYSQL_TABLE="logs"

# Log dosyası konumu
LOG_FILE="/var/log/apache2/access.log"

# Tabloyu oluşturma fonksiyonu
setup_table() {
    mysql -u$MYSQL_USER -p$MYSQL_PASSWORD -h$MYSQL_HOST $MYSQL_DB -e "
    CREATE TABLE IF NOT EXISTS $MYSQL_TABLE (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ip_address VARCHAR(15),
        timestamp DATETIME,
        request_method VARCHAR(10),
        request_uri VARCHAR(255),
        status_code INT,
        size INT,
        referrer VARCHAR(255),
        user_agent VARCHAR(255)
    );"

    if [ $? -eq 0 ]; then
        echo "Tablo kontrol edildi/oluşturuldu: $MYSQL_TABLE"
    else
        echo "Tablo oluşturulamadı!"
        exit 1
    fi
}

# Veritabanına veri ekleme fonksiyonu
insert_log() {
    local ip="$1"
    local timestamp="$2"
    local method="$3"
    local uri="$4"
    local status="$5"
    local size="$6"
    local referrer="$7"
    local user_agent="$8"

    # Hata mesajlarını görmek için stderr’ı açıyoruz
    mysql -u$MYSQL_USER -p$MYSQL_PASSWORD -h$MYSQL_HOST $MYSQL_DB -e "
    INSERT INTO $MYSQL_TABLE (
        ip_address, timestamp, request_method, request_uri,
        status_code, size, referrer, user_agent
    ) VALUES (
        '$ip', '$timestamp', '$method', '$uri',
        $status, $size, '$referrer', '$user_agent'
    );" 2>&1

    if [ $? -eq 0 ]; then
        echo "Yeni log eklendi: $ip - $timestamp"
    else
        echo "Log eklenemedi!"
    fi
}

# Bağlantıyı test et
echo "MariaDB bağlantısı test ediliyor..."
mysql -u$MYSQL_USER -p$MYSQL_PASSWORD -h$MYSQL_HOST $MYSQL_DB -e "SELECT 1;" 2>&1
if [ $? -ne 0 ]; then
    echo "MariaDB’ye bağlanılamadı!"
    exit 1
fi

# Tabloyu oluştur/kontrol et
setup_table

# Log dosyasını izle ve yeni satırları işle
echo "Apache access.log izleniyor: $LOG_FILE"
tail -f "$LOG_FILE" | while read -r line; do
    echo "Yeni satır algılandı: $line" # Hata ayıklama için
    # Log satırını parçalara ayır
    ip=$(echo "$line" | awk '{print $1}')
    # Zaman damgasını ayrıştır
    raw_time=$(echo "$line" | grep -oP '\[\K[^\]]+')
    day=$(echo "$raw_time" | cut -d'/' -f1)
    month=$(echo "$raw_time" | cut -d'/' -f2)
    year_time=$(echo "$raw_time" | cut -d'/' -f3)
    year=$(echo "$year_time" | cut -d':' -f1)
    time=$(echo "$year_time" | cut -d':' -f2- | sed 's/ +0300//')
    month_num=$(date -d "1 $month 2000" +%m)
    timestamp="$year-$month_num-$day $time"

    request=$(echo "$line" | grep -oP '"\K[^"]+' | head -n 1)
    method=$(echo "$request" | awk '{print $1}')
    uri=$(echo "$request" | awk '{print $2}')
    status=$(echo "$line" | awk '{print $9}')
    size=$(echo "$line" | awk '{print $10}')
    referrer=$(echo "$line" | grep -oP '"\s\d{3}\s\d+\s"\K[^"]+' | head -n 1)
    user_agent=$(echo "$line" | grep -oP '"\s\d{3}\s\d+\s"[^"]+"\s"\K[^"]+' | head -n 1)

    # Değerleri kontrol etmeden önce temizle
    [ -z "$method" ] || [ "$method" = "\"" ] || [ "$method" = "\"-\"" ] && method="-"
    [ -z "$uri" ] || [ "$uri" = "\"" ] && uri="-"
    [ -z "$status" ] || [ "$status" = "-" ] || [ "$status" = "\"-\"" ] && status="-"
    [ -z "$size" ] || [ "$size" = "-" ] || [ "$size" = "\"-\"" ] && size="-"
    [ -z "$referrer" ] || [ "$referrer" = "\"" ] && referrer="-"
    [ -z "$user_agent" ] || [ "$user_agent" = "\"" ] && user_agent="-"

    # Tüm değerler - veya boşsa pas geç
    if [ "$method" = "-" ] && [ "$uri" = "-" ] && [ "$status" = "-" ] && [ "$size" = "-" ] && [ "$referrer" = "-" ] && [ "$user_agent" = "-" ]; then
        echo "Boş log atlandı: $ip - $timestamp"
        continue
    fi

    # Boş değerler için varsayılan (eklemeden önce)
    [ "$status" = "-" ] && status=0
    [ "$size" = "-" ] && size=0

    # Veritabanına ekle
    insert_log "$ip" "$timestamp" "$method" "$uri" "$status" "$size" "$referrer" "$user_agent"
done