#!/bin/bash

MYSQL_USER="admin"
MYSQL_PASSWORD="rootroot"
MYSQL_HOST="172.20.10.14"
MYSQL_DB="NextWAF"
MYSQL_TABLE="logs"
IDS_TABLE="idsLogs"

LOG_FILE="/var/log/apache2/access.log"

TEMP_FILE="/tmp/ddos_check"

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

setup_ids_table() {
    mysql -u$MYSQL_USER -p$MYSQL_PASSWORD -h$MYSQL_HOST $MYSQL_DB -e "
    CREATE TABLE IF NOT EXISTS $IDS_TABLE (
        id INT AUTO_INCREMENT PRIMARY KEY,
        timestamp DATETIME,
        attack_type VARCHAR(50),
        ip_address VARCHAR(15),
        request_uri VARCHAR(255),
        user_agent VARCHAR(255),
        status_code INT,
        checked BOOLEAN DEFAULT FALSE
    );"
    [ $? -eq 0 ] && echo "IDS tablosu kontrol edildi/oluşturuldu: $IDS_TABLE" || { echo "IDS tablosu oluşturulamadı!"; exit 1; }
}

escape_string() {
    printf '%s' "$1" | sed "s/'/''/g"
}

insert_log() {
    local ip=$(escape_string "$1")
    local timestamp=$(escape_string "$2")
    local method=$(escape_string "$3")
    local uri=$(escape_string "$4")
    local status="$5"
    local size="$6"
    local referrer=$(escape_string "$7")
    local user_agent=$(escape_string "$8")

    last_log=$(mysql -u$MYSQL_USER -p$MYSQL_PASSWORD -h$MYSQL_HOST $MYSQL_DB -N -e "
    SELECT COUNT(*) FROM $MYSQL_TABLE WHERE ip_address='$ip' AND timestamp='$timestamp' AND request_uri='$uri' 
    ORDER BY id DESC LIMIT 1;")

    if [ "$last_log" -eq 0 ]; then
        mysql -u$MYSQL_USER -p$MYSQL_PASSWORD -h$MYSQL_HOST $MYSQL_DB -e "
        INSERT INTO $MYSQL_TABLE (
            ip_address, timestamp, request_method, request_uri,
            status_code, size, referrer, user_agent
        ) VALUES (
            '$ip', '$timestamp', '$method', '$uri',
            '$status', '$size', '$referrer', '$user_agent'
        );" 2>&1

        [ $? -eq 0 ] && echo "Yeni log eklendi: $ip - $timestamp" || echo "Log eklenemedi!"
    else
        echo "Aynı timestamp ve request_uri ile log zaten var, atlandı: $ip - $timestamp"
    fi
}

insert_ids_log() {
    local timestamp=$(escape_string "$1")
    local attack_type=$(escape_string "$2")
    local ip=$(escape_string "$3")
    local uri=$(escape_string "$4")
    local user_agent=$(escape_string "$5")
    local status="$6"

    if [ "$attack_type" != "DDoS" ]; then
        mysql -u$MYSQL_USER -p$MYSQL_PASSWORD -h$MYSQL_HOST $MYSQL_DB -e "
        INSERT INTO $IDS_TABLE (
            timestamp, attack_type, ip_address, request_uri, user_agent, status_code
        ) VALUES (
            '$timestamp', '$attack_type', '$ip', '$uri', '$user_agent', '$status'
        );" 2>&1

        [ $? -eq 0 ] && echo "Saldırı tespit edildi ve kaydedildi: $attack_type - $ip - $uri" || echo "IDS log eklenemedi!"
    else
        last_timestamp=$(mysql -u$MYSQL_USER -p$MYSQL_PASSWORD -h$MYSQL_HOST $MYSQL_DB -N -e "
        SELECT timestamp FROM $IDS_TABLE WHERE ip_address='$ip' AND attack_type='DDoS' 
        ORDER BY id DESC LIMIT 1;")

        if [ "$last_timestamp" != "$timestamp" ]; then
            mysql -u$MYSQL_USER -p$MYSQL_PASSWORD -h$MYSQL_HOST $MYSQL_DB -e "
            INSERT INTO $IDS_TABLE (
                timestamp, attack_type, ip_address, request_uri, user_agent, status_code
            ) VALUES (
                '$timestamp', '$attack_type', '$ip', '$uri', '$user_agent', '$status'
            );" 2>&1

            [ $? -eq 0 ] && echo "Saldırı tespit edildi ve kaydedildi: $attack_type - $ip - $uri" || echo "IDS log eklenemedi!"
        else
            echo "Aynı timestamp ile DDoS kaydı zaten var, atlandı: $ip - $timestamp"
        fi
    fi
}

check_attacks() {
    local uri="$1"
    local ip="$2"
    local timestamp="$3"
    local user_agent="$4"
    local status="$5"

    if echo "$uri" | grep -iE "(<script|alert\(|document\.cookie|xss|console\.log)"; then
        insert_ids_log "$timestamp" "XSS" "$ip" "$uri" "$user_agent" "$status"
    fi

    if echo "$uri" | grep -iE "(select.*from|union.*select|drop.*table|1=1|--|'|%27)"; then
        insert_ids_log "$timestamp" "SQL Injection" "$ip" "$uri" "$user_agent" "$status"
    fi

    if echo "$uri" | grep -iE "(\.\./|\.\.%2f|etc/passwd|php://|file://)"; then
        insert_ids_log "$timestamp" "File Inclusion" "$ip" "$uri" "$user_agent" "$status"
    fi

    echo "$ip" >> "$TEMP_FILE"
    request_count=$(grep -c "$ip" "$TEMP_FILE")
    if [ "$request_count" -gt 20 ]; then  # 1 dakikada 20 istek
        insert_ids_log "$timestamp" "DDoS" "$ip" "$uri" "$user_agent" "$status"
        echo "DDoS saldırısı: $ip - $request_count istek"
    fi
}

echo "Veritabanı bağlantısı test ediliyor..."
mysql -u$MYSQL_USER -p$MYSQL_PASSWORD -h$MYSQL_HOST $MYSQL_DB -e "SELECT 1;" 2>&1
[ $? -ne 0 ] && { echo "Veritabanına bağlanılamadı!"; exit 1; }

setup_table
setup_ids_table

# DDoS kontrolü için her dakika sıfırlanıyor.
(while true; do sleep 60; > "$TEMP_FILE"; done) &

echo "Apache access.log izleniyor: $LOG_FILE"
tail -f "$LOG_FILE" | while read -r line; do
    echo "$line"
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

    [ -z "$method" ] || [ "$method" = "\"" ] || [ "$method" = "\"-\"" ] && method="-"
    [ -z "$uri" ] || [ "$uri" = "\"" ] && uri="-"
    [ -z "$status" ] || [ "$status" = "-" ] || [ "$status" = "\"-\"" ] && status="-"
    [ -z "$size" ] || [ "$size" = "-" ] || [ "$size" = "\"-\"" ] && size="-"
    [ -z "$referrer" ] || [ "$referrer" = "\"" ] && referrer="-"
    [ -z "$user_agent" ] || [ "$user_agent" = "\"" ] && user_agent="-"

    if [ "$method" = "-" ] && [ "$uri" = "-" ] && [ "$status" = "-" ] && [ "$size" = "-" ] && [ "$referrer" = "-" ] && [ "$user_agent" = "-" ]; then
        echo "$ip - $timestamp"
        continue
    fi

    [ "$status" = "-" ] && status=0
    [ "$size" = "-" ] && size=0

    check_attacks "$uri" "$ip" "$timestamp" "$user_agent" "$status"

    insert_log "$ip" "$timestamp" "$method" "$uri" "$status" "$size" "$referrer" "$user_agent"
done

