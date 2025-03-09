#!/bin/bash

# MySQL/MariaDB Bağlantı Bilgileri
MYSQL_USER="admin"
MYSQL_PASSWORD="rootroot"
MYSQL_HOST="10.211.55.5"
MYSQL_DB="NextWAF"
MYSQL_TABLE="logs"
IDS_TABLE="idsLogs"

# Log dosyası konumu
LOG_FILE="/var/log/apache2/access.log"

# Log tablosunu oluşturma fonksiyonu
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
    [ $? -eq 0 ] && echo "Tablo kontrol edildi/oluşturuldu: $MYSQL_TABLE" || { echo "Tablo oluşturulamadı!"; exit 1; }
}

# IDS tablosunu oluşturma fonksiyonu
setup_ids_table() {
    mysql -u$MYSQL_USER -p$MYSQL_PASSWORD -h$MYSQL_HOST $MYSQL_DB -e "
    CREATE TABLE IF NOT EXISTS $IDS_TABLE (
        id INT AUTO_INCREMENT PRIMARY KEY,
        timestamp DATETIME,
        attack_type VARCHAR(50),
        ip_address VARCHAR(15),
        request_uri VARCHAR(255),
        user_agent VARCHAR(255)
    );"
    [ $? -eq 0 ] && echo "IDS tablosu kontrol edildi/oluşturuldu: $IDS_TABLE" || { echo "IDS tablosu oluşturulamadı!"; exit 1; }
}

# Verileri escape eden fonksiyon
escape_string() {
    printf '%s' "$1" | sed "s/'/''/g"  # Tek tırnağı çift tırnakla değiştir (MariaDB/MySQL escaping)
}

# Log ekleme fonksiyonu
insert_log() {
    local ip=$(escape_string "$1")
    local timestamp=$(escape_string "$2")
    local method=$(escape_string "$3")
    local uri=$(escape_string "$4")
    local status="$5"
    local size="$6"
    local referrer=$(escape_string "$7")
    local user_agent=$(escape_string "$8")

    mysql -u$MYSQL_USER -p$MYSQL_PASSWORD -h$MYSQL_HOST $MYSQL_DB -e "
    INSERT INTO $MYSQL_TABLE (
        ip_address, timestamp, request_method, request_uri,
        status_code, size, referrer, user_agent
    ) VALUES (
        '$ip', '$timestamp', '$method', '$uri',
        '$status', '$size', '$referrer', '$user_agent'
    );" 2>&1

    [ $? -eq 0 ] && echo "Yeni log eklendi: $ip - $timestamp" || echo "Log eklenemedi!"
}

# IDS log ekleme fonksiyonu
insert_ids_log() {
    local timestamp=$(escape_string "$1")
    local attack_type=$(escape_string "$2")
    local ip=$(escape_string "$3")
    local uri=$(escape_string "$4")
    local user_agent=$(escape_string "$5")

    mysql -u$MYSQL_USER -p$MYSQL_PASSWORD -h$MYSQL_HOST $MYSQL_DB -e "
    INSERT INTO $IDS_TABLE (
        timestamp, attack_type, ip_address, request_uri, user_agent
    ) VALUES (
        '$timestamp', '$attack_type', '$ip', '$uri', '$user_agent'
    );" 2>&1

    [ $? -eq 0 ] && echo "Saldırı tespit edildi ve kaydedildi: $attack_type - $ip - $uri" || echo "IDS log eklenemedi!"
}

# Saldırı kontrol fonksiyonu (console.log ve %27 eklendi)
check_attacks() {
    local uri="$1"
    local ip="$2"
    local timestamp="$3"
    local user_agent="$4"

    # XSS kontrolü (console.log eklendi)
    if echo "$uri" | grep -iE "(<script|alert\(|document\.cookie|xss|console\.log)"; then
        insert_ids_log "$timestamp" "XSS" "$ip" "$uri" "$user_agent"
    fi

    # SQL Injection kontrolü (%27 eklendi)
    if echo "$uri" | grep -iE "(select.*from|union.*select|drop.*table|1=1|--|'|%27)"; then
        insert_ids_log "$timestamp" "SQL Injection" "$ip" "$uri" "$user_agent"
    fi

    # File Inclusion kontrolü
    if echo "$uri" | grep -iE "(\.\./|\.\.%2f|etc/passwd|php://|file://)"; then
        insert_ids_log "$timestamp" "File Inclusion" "$ip" "$uri" "$user_agent"
    fi
}

# Bağlantıyı test et
echo "MariaDB bağlantısı test ediliyor..."
mysql -u$MYSQL_USER -p$MYSQL_PASSWORD -h$MYSQL_HOST $MYSQL_DB -e "SELECT 1;" 2>&1
[ $? -ne 0 ] && { echo "MariaDB’ye bağlanılamadı!"; exit 1; }

# Tabloları oluştur/kontrol et
setup_table
setup_ids_table

# Log dosyasını izle ve yeni satırları işle
echo "Apache access.log izleniyor: $LOG_FILE"
tail -f "$LOG_FILE" | while read -r line; do
    echo "Yeni satır algılandı: $line"
    ip=$(echo "$line" | awk '{print $1}')
    raw_time=$(echo "$line" | grep -oP '\[\K[^\]]+' || echo "")
    if [ -n "$raw_time" ]; then
        day=$(echo "$raw_time" | cut -d'/' -f1)
        month=$(echo "$raw_time" | cut -d'/' -f2)
        year_time=$(echo "$raw_time" | cut -d'/' -f3)
        year=$(echo "$year_time" | cut -d':' -f1)
        time=$(echo "$year_time" | cut -d':' -f2- | sed 's/ +0300//')
        month_num=$(date -d "1 $month 2000" +%m 2>/dev/null || echo "01")
        timestamp="$year-$month_num-$day $time"
    else
        timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    fi

    request=$(echo "$line" | grep -oP '"\K[^"]+' | head -n 1 || echo "- -")
    method=$(echo "$request" | awk '{print $1}')
    uri=$(echo "$request" | awk '{print $2}')
    status=$(echo "$line" | awk '{print $9}')
    size=$(echo "$line" | awk '{print $10}')
    referrer=$(echo "$line" | grep -oP '"\s\d{3}\s\d+\s"\K[^"]+' | head -n 1 || echo "-")
    user_agent=$(echo "$line" | grep -oP '"\s\d{3}\s\d+\s"[^"]+"\s"\K[^"]+' | head -n 1 || echo "-")

    # Değerleri temizle
    [ -z "$method" ] || [ "$method" = "\"" ] || [ "$method" = "\"-\"" ] && method="-"
    [ -z "$uri" ] || [ "$uri" = "\"" ] && uri="-"
    [ -z "$status" ] || [ "$status" = "-" ] || [ "$status" = "\"-\"" ] && status="-"
    [ -z "$size" ] || [ "$size" = "-" ] || [ "$size" = "\"-\"" ] && size="-"
    [ -z "$referrer" ] || [ "$referrer" = "\"" ] && referrer="-"
    [ -z "$user_agent" ] || [ "$user_agent" = "\"" ] && user_agent="-"

    # Boş log kontrolü
    if [ "$method" = "-" ] && [ "$uri" = "-" ] && [ "$status" = "-" ] && [ "$size" = "-" ] && [ "$referrer" = "-" ] && [ "$user_agent" = "-" ]; then
        echo "Boş log atlandı: $ip - $timestamp"
        continue
    fi

    # Varsayılan değerler
    [ "$status" = "-" ] && status=0
    [ "$size" = "-" ] && size=0

    # Saldırıları kontrol et
    check_attacks "$uri" "$ip" "$timestamp" "$user_agent"

    # Logu ekle
    insert_log "$ip" "$timestamp" "$method" "$uri" "$status" "$size" "$referrer" "$user_agent"
done