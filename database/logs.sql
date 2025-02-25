CREATE TABLE packets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    source_ip VARCHAR(45) NOT NULL,
    destination_ip VARCHAR(45) NOT NULL,
    port INT NOT NULL,
    directory VARCHAR(255) NOT NULL,
    header TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Örnek veriler
INSERT INTO packets (source_ip, destination_ip, port, directory, header) VALUES
('192.168.1.1', '192.168.1.2', 80, '/index.html', 'User-Agent: Mozilla/5.0'),
('192.168.1.3', '192.168.1.4', 443, '/login', 'User-Agent: Chrome/90.0'),
('192.168.1.5', '192.168.1.6', 8080, '/api/data', 'User-Agent: Safari/14.0');
