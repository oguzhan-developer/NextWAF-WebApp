CREATE TABLE server_stats (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ram VARCHAR(50) NOT NULL,
    cpu VARCHAR(50) NOT NULL,
    storage VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Örnek veriler
INSERT INTO server_stats (ram, cpu, storage) VALUES
('8GB', '20%', '100GB'),
('16GB', '30%', '200GB'),
('32GB', '40%', '500GB');
