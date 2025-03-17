import axios from 'axios';
//username: admin
//pass rootroot
const dbPort = import.meta.env.VITE_APP_API_PORT || 5058;
const dbIP = import.meta.env.VITE_APP_DB_IP || "172.20.10.2";
const system_ip = import.meta.env.VITE_APP_CMD_API_IP || '172.17.0.1';
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
        const response = await axios.get(`http://${dbIP}:${dbPort}/api/server-stats?limit=${limit}`);
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
        const response = await axios.get(`http://${dbIP}:${dbPort}/api/logs`, {
            params: {
                page,
                limit,
                search,
                sortField,
                sortDirection
            }
        });

        const totalCountResponse = await axios.get(`http://${dbIP}:${dbPort}/api/logs-count`, {
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
export const removeIDSLog = async (id) => {
    try {
        const response = await axios.delete(`http://${dbIP}:${dbPort}/api/idsLogs/${id}`);
        return response.data;
    } catch (error) {
        const message = 'IDS logu silinirken hata oluştu';
        console.error(message, error);
        return message;
    }
}

export const changeIDSLogStatus = async (id, currentStatus) => {
    try {
        const response = await axios.post(`http://${dbIP}:${dbPort}/api/idsLogs/${id}/status`,
            {
                status: currentStatus ? 0 : 1 //1 ise 0, 0 ise 1 yapması için   
            });

    } catch (error) {
        console.error('IDS log durumu değiştirilirken hata oluştu', error);
        return "İletişim Hatası!"
    }
}

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

export async function fetchIDSLogs() {
    try {
        const response = await axios.get(`http://${dbIP}:${dbPort}/api/idsLogs`);
        console.log(response.data);

        return response.data.logs;
    } catch (error) {
        console.error('Logları çekerken hata oluştu:', error);
        throw error;
    }
}

// E-posta bağlantısını test et
export async function testEmailConnection() {
    try {
        const response = await axios.get(`http://${dbIP}:${dbPort}/api/test-email`);
        return response.data;
    } catch (error) {
        console.error('E-posta testi başarısız:', error);
        return { success: false, message: 'Sunucu ile iletişim kurulamadı' };
    }
}

export async function sendTestIDSMail() {
    try {
        const response = await axios.post(`http://${dbIP}:${dbPort}/api/send-test-email`);
        return response.data;
    } catch (error) {
        console.error('Test mail gönderilirken hata oluştu:', error);
        throw error;
    }
}

// Profilleri getir
export const fetchUsers = async () => {
    try {
        const response = await axios.get(`http://${dbIP}:${dbPort}/api/users`);
        return response.data.users;
    } catch (error) {
        console.error('Kullanıcılar getirilirken hata oluştu:', error);
        throw error;
    }
};

export const fetchProfileDetails = async (id) => {
    try {
        const response = await axios.get(`http://${dbIP}:${dbPort}/api/users/${id}`);
        return response.data.user;
    } catch (error) {
        console.error('Profil detayı getirilirken hata oluştu:', error);
        throw error;
    }
};

// Profil güncelle
export const updateProfile = async (id, profileData) => {
    try {
        const response = await axios.put(`http://${dbIP}:${dbPort}/api/users/${id}`, profileData);
        return response.data;
    } catch (error) {
        console.error('Profil güncellenirken hata oluştu:', error);
        throw error;
    }
};

// Yeni profil oluştur
export const createProfile = async (profileData) => {
    try {
        const response = await axios.post(`http://${dbIP}:${dbPort}/api/users`, profileData);
        return response.data;
    } catch (error) {
        console.error('Profil oluşturulurken hata oluştu:', error);
        throw error;
    }
};

// Kullanıcı sil
export const deleteUser = async (id) => {
    try {
        const response = await axios.delete(`http://${dbIP}:${dbPort}/api/users/${id}`);
        return response.data;
    } catch (error) {
        console.error('Kullanıcı silinirken hata oluştu:', error);
        throw error;
    }
};

// Logout fonksiyonu
export const logout = async (username) => {
  try {
    const response = await axios.post(`http://localhost:${dbPort}/api/logout`, { username });
    return response.data;
  } catch (error) {
    console.error('Çıkış yaparken hata oluştu:', error);
    throw error;
  }
};

// Aktif kullanıcıları getir
export const fetchActiveUsers = async () => {
  try {
    const response = await axios.get(`http://localhost:${dbPort}/api/active-users`);
    return response.data.users;
  } catch (error) {
    console.error('Aktif kullanıcılar getirilirken hata oluştu:', error);
    throw error;
  }
};




