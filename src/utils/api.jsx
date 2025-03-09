import axios from 'axios';
//username: admin
//pass rootroot
const dbPort = import.meta.env.VITE_APP_API_PORT || 5058;
const system_ip = import.meta.env.VITE_APP_SYSTEM_IP || '10.211.55.5';
const system_port = import.meta.env.VITE_APP_SYSTEM_PORT || '8080';
console.log(dbPort);

// export const fetchLogs = async () => {
//     try {
//         const response = await axios.get(`http://localhost:${dbPort}/api/logs`);
//         console.log(response.data.logs);

//         return response.data.logs;
//     } catch (error) {
//         console.error('Logları çekerken hata oluştu:', error);
//         throw error;
//     }
// };

export const fetchServerStats = async (limit) => {
    try {
        const response = await axios.get(`http://localhost:${dbPort}/api/server-stats?limit=${limit}`);
        return response.data.stats;
    } catch (error) {
        console.error('Sunucu istatistiklerini çekerken hata oluştu:', error);
        throw error;
    }
};

export const fetchServerIp = async () => {
    try {
        const response = await axios.get(`http://${system_ip}:${system_port}/cmd.php`, {
            params: {
                command: "hostname -I | awk '{print $1}'"
            }
        });

        return response.data.output;
    } catch (error) {
        console.error('Sunucu IP adresini çekerken hata oluştu:', error);
        throw error;
    }
};


export const fetchOpenPorts = async () => {
    try {
        const response = await axios.get(`http://${system_ip}:${system_port}/cmd.php`, {
            params: {
                command: `ss -tuln | grep -q ":80" && (ss -tuln | grep -q ":443" && echo "80 ve 443 açık" || echo "80 açık") || (ss -tuln | grep -q ":443" && echo "443 açık" || echo "80 ve 443 kapalı")`
            }
        });

        return response.data.output;
    } catch (error) {
        console.error('Açık portları çekerken hata oluştu:', error);
        throw error;
    }
};

export const fetchIsApacheActive = async () => {
    try {
        const response = await axios.get(`http://${system_ip}:${system_port}/cmd.php`, {
            params: {
                command: `systemctl is-active apache2 >/dev/null && echo "Aktif" || echo "Pasif"`
            }
        });
        console.log(response.data.output);

        return response.data.output;
    } catch (error) {
        console.error('Açık portları çekerken hata oluştu:', error);
        throw error;
    }
};
export const setApacheStatus = async (changeStatus) => {
    try {
        // changeStatus -> yapılmak istenen durum
        let status = ""
        if (changeStatus == "Aktif") status = "start"
        if (changeStatus == "Pasif") status = "stop"
        const response = await axios.get(`http://${system_ip}:${system_port}/cmd.php`, {
            params: {
                command: `systemctl ${status} apache2`
            }
        });
        console.log(response);

        console.log(response.data.output);

        return response.data.output;
    } catch (error) {
        console.error('Apache servisi aktifleştirilirken/pasifleştirilirken hata oluştu:', error);
        throw error;
    }
};
export const fetchOS = async () => {
    try {
        const response = await axios.get(`http://${system_ip}:${system_port}/cmd.php`, {
            params: {
                command: `grep "PRETTY_NAME" /etc/os-release | cut -d'"' -f2`
            }
        });
        console.log(response.data.output);

        return response.data.output;
    } catch (error) {
        console.error('İşletim sistemi getirilirken hata oluştu:', error);
        throw error;
    }
};
export const fetchOSVersion = async () => {
    try {
        const response = await axios.get(`http://${system_ip}:${system_port}/cmd.php`, {
            params: {
                command: `uname -r`
            }
        });
        console.log(response.data.output);

        return response.data.output;
    } catch (error) {
        console.error('İşletim sistemi versiyonu getirilirken hata oluştu:', error);
        throw error;
    }
};
export const fetchApacheVersion = async () => {
    try {
        const response = await axios.get(`http://${system_ip}:${system_port}/cmd.php`, {
            params: {
                command: `apache2 -v | grep "Server version" | awk '{print $3}' | cut -d'/' -f2`
            }
        });
        console.log(response.data.output);

        return response.data.output;
    } catch (error) {
        console.error('Apache versiyonu getirilirken hata oluştu:', error);
        throw error;
    }
};
export const fetchPHPVersion = async () => {
    try {
        const response = await axios.get(`http://${system_ip}:${system_port}/cmd.php`, {
            params: {
                command: `php -v | head -n 1 | awk '{print $2}'`
            }
        });
        console.log(response.data.output);

        return response.data.output;
    } catch (error) {
        console.error('PHP versiyonu getirilirken hata oluştu:', error);
        throw error;
    }
};
export const fetchMySQLVersion = async () => {
    try {
        const response = await axios.get(`http://${system_ip}:${system_port}/cmd.php`, {
            params: {
                command: 'mysql --version | grep -oP "\\d+\\.\\d+\\.\\d+"'
            }
        });
        console.log(response.data.output);

        return response.data.output;
    } catch (error) {
        console.error('MySQL versiyonu getirilirken hata oluştu:', error);
        throw error;
    }
};
export const fetchIsMySQLActive = async () => {
    try {
        const response = await axios.get(`http://${system_ip}:${system_port}/cmd.php`, {
            params: {
                command: `systemctl is-active mysql >/dev/null 2>&1 && echo "Aktif" || echo "Pasif"`
            },
            timeout: 3000
        });
        console.log(response.data.output);

        return response.data.output;
    } catch (error) {
        console.error('MySQL durumu getirilirken hata oluştu:', error);
        return "İletişim Hatası!"
        throw error;
    }
};
export const fetchIsSystemActive = async () => {
    try {
        const response = await axios.get(`http://${system_ip}:${system_port}/cmd.php`, {
            params: {
                command: 'whoami'
            },
            timeout: 4000
        });
        console.log(response.data.output);

        return "Aktif"
    } catch (error) {
        return "Pasif"
    }
};

export async function fetchLogs(params = {}) { //from DB
    try {
        const { page = 1, limit = 10, search = '', sortField = 'timestamp', sortDirection = 'desc' } = params;

        console.log(`Logs isteği - Sayfa: ${page}, Limit: ${limit}`);

        // API isteğini yapıyoruz
        const response = await axios.get(`http://localhost:${dbPort}/api/logs`, {
            params: {
                page,
                limit,
                search,
                sortField,
                sortDirection
            }
        });

        // Başlıklar yerine toplam kayıt sayısını hesaplamak için önce ana isteği yap
        const totalCountResponse = await axios.get(`http://localhost:${dbPort}/api/logs-count`, {
            params: { search }
        });

        // Toplam kayıt sayısını al
        const totalCount = totalCountResponse.data.count || 0;

        // Toplam sayfa sayısını hesapla
        const totalPages = Math.ceil(totalCount / limit) || 1;

        console.log(`Manuel hesaplanan pagination - Toplam kayıt: ${totalCount}, Sayfa sayısı: ${totalPages}, Şu anki: ${page}`);

        return {
            data: response.data || [],
            totalPages: totalPages,
            total: totalCount,
            currentPage: page
        };
    } catch (error) {
        console.error('Erişim logları çekilirken bir hata oluştu:', error);
        throw error;
    }
}

// IDS servislerinin durumunu getir
export async function fetchIDSServices() {
    try {
        // Bu kısmı gerçek API endpoint'iyle değiştirin
        // Mock veri dönüyoruz şimdilik
        return {
            ddos: 'active',
            xss: 'inactive',
            sqlinjection: 'active'
        };
    } catch (error) {
        console.error('IDS servisleri alınırken hata oluştu:', error);
        throw error;
    }
}

export const fethIsHTTPPortActive = async () => {
    try {
        const response = await axios.get(`http://${system_ip}:${system_port}/cmd.php`, {
            params: {
                command: `sudo firewall-cmd --query-port=80/tcp`
            },
            timeout: 3000
        });
        const status = response.data.output
        if (status == "yes") return "Aktif"
        if (status == "no") return "Pasif"
        else throw error;
    } catch (error) {
        console.error('80 Portu durumu getirilirken hata oluştu:', error);
        return "İletişim Hatası!"
        throw error;
    }
};

export const fethIsHTTPSPortActive = async () => {
    try {
        const response = await axios.get(`http://${system_ip}:${system_port}/cmd.php`, {
            params: {
                command: `sudo firewall-cmd --query-port=443/tcp`
            },
            timeout: 3000
        });
        const status = response.data.output
        if (status == "yes") return "Aktif"
        if (status == "no") return "Pasif"
        else throw error;
    } catch (error) {
        console.error('80 Portu durumu getirilirken hata oluştu:', error);
        return "İletişim Hatası!"
        throw error;
    }
};

export const changeWebServiceStatus = async (status, port) => { 
    try {
        const command = (status == "Aktif" ? "remove" : "add") //Aktifse remove ile silecek.
        const response = await axios.get(`http://${system_ip}:${system_port}/cmd.php`, {
            params: {
                command: `sudo firewall-cmd --permanent --${command}-port=${port}/tcp && sudo firewall-cmd --reload`
            },
            timeout: 3000
        });
    } catch (error) {
        console.error('80/443 port durumu getirilirken hata oluştu:', error);
        return "İletişim Hatası!"
    }
};


// Güvenlik loglarını getir
export async function fetchSecurityLogs() {
    try {
        // dummydata
        return [
            {
                timestamp: '2023-05-15T10:23:45',
                ip_address: '192.168.1.105',
                attack_type: 'SQL Injection',
                target_url: '/api/users?id=1 OR 1=1',
                severity: 'high',
                action: 'blocked'
            },
            {
                timestamp: '2023-05-15T09:17:32',
                ip_address: '192.168.1.107',
                attack_type: 'XSS',
                target_url: '/blog/post?comment=<script>alert("XSS")</script>',
                severity: 'medium',
                action: 'blocked'
            },
            {
                timestamp: '2023-05-14T22:45:11',
                ip_address: '192.168.1.120',
                attack_type: 'Brute Force',
                target_url: '/login',
                severity: 'medium',
                action: 'blocked'
            },
            {
                timestamp: '2023-05-14T16:30:22',
                ip_address: '192.168.1.115',
                attack_type: 'File Inclusion',
                target_url: '/page?load=../../../etc/passwd',
                severity: 'high',
                action: 'blocked'
            },
            {
                timestamp: '2023-05-14T12:10:15',
                ip_address: '192.168.1.111',
                attack_type: 'Command Injection',
                target_url: '/search?q=test;cat /etc/passwd',
                severity: 'high',
                action: 'blocked'
            },
        ];
    } catch (error) {
        console.error('Güvenlik logları alınırken hata oluştu:', error);
        throw error;
    }
}



