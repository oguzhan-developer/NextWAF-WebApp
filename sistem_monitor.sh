#!/bin/bash

MYSQL_USER="admin"
MYSQL_PASSWORD="rootroot"
MYSQL_HOST="172.20.10.14"
MYSQL_DB="NextWAF"
MYSQL_TABLE="sistem_monitor"

setup_database() {
    mysql -u$MYSQL_USER -p$MYSQL_PASSWORD -h$MYSQL_HOST -e "CREATE DATABASE IF NOT EXISTS $MYSQL_DB;"
    
    mysql -u$MYSQL_USER -p$MYSQL_PASSWORD -h$MYSQL_HOST $MYSQL_DB -e "
    CREATE TABLE IF NOT EXISTS $MYSQL_TABLE (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tarih TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        totalRAM INT,
        usingRAM INT,
        RAMYuzdesi DECIMAL(5,2),
        totalCPU DECIMAL(5,2),
        usingCPU DECIMAL(5,2),
        CPUYuzdesi DECIMAL(5,2),
        totalDisk VARCHAR(10),
        usingDisk VARCHAR(10),
        diskYuzdesi VARCHAR(10)
    );"
    
    if [ $? -ne 0 ]; then
        echo "Veritabanı yapılandırması başarısız oldu!"
        exit 1
    fi
}

mysql_insert() {
    mysql -u$MYSQL_USER -p$MYSQL_PASSWORD -h$MYSQL_HOST $MYSQL_DB -e "
    INSERT INTO $MYSQL_TABLE (
        totalRAM, usingRAM, RAMYuzdesi, 
        totalCPU, usingCPU, CPUYuzdesi,
        totalDisk, usingDisk, diskYuzdesi
    ) VALUES (
        $1, $2, $3,
        $4, $5, $6,
        '$7', '$8', $9
    );"
    
    if [ $? -eq 0 ]; then
        echo "Veri başarıyla kaydedildi."
    else
        echo "Veri kaydedilemedi!"
    fi
}


setup_database

echo "Veriler veritabanına kaydediliyor..."
echo "----------------------------------------"

while true; do
    currentTime=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "\n$currentTime"
    echo "----------------------------------------"
    
    totalRAM=$(free -m | grep Mem | awk '{print $2}')
    usingRAM=$(free -m | grep Mem | awk '{print $3}')
    RAMKYuzde=$(free | grep Mem | awk '{printf("%.2f"), $3/$2*100}')
    
    usingCPUYuzde=$(top -bn1 | grep "Cpu(s)" | awk '{print $2 + $4}')
    
    cpu_cores=$(grep -c ^processor /proc/cpuinfo)
    
    totalCPU=$(awk -v cores="$cpu_cores" 'BEGIN {printf "%.2f", cores}')
    
    usingCPU=$(awk -v total="$totalCPU" -v usage="$usingCPUYuzde" 'BEGIN {printf "%.2f", total * usage / 100}')
    
    df_output=$(df -h / | tail -n 1)
    total_disk=$(echo "$df_output" | awk '{print $2}' | sed 's/G$//')
    used_disk=$(echo "$df_output" | awk '{print $3}' | sed 's/G$//')
    disk_usage_percentage=$(echo "$df_output" | awk '{print $5}' | sed 's/%//g')
    
    echo "RAM: $usingRAM/$totalRAM MB ($RAMKYuzde%)"
    echo "CPU: $usingCPU/$totalCPU CPU ($usingCPUYuzde%)"
    echo "Disk: $used_disk/$total_disk (${disk_usage_percentage}%)"
    
    mysql_insert "$totalRAM" "$usingRAM" "$RAMKYuzde" \
                "$totalCPU" "$usingCPU" "$usingCPUYuzde" \
                "$total_disk" "$used_disk" "$disk_usage_percentage"
    
    echo "----------------------------------------"
    
    sleep 60
done