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
        if(changeStatus == "Aktif" )status = "start"
        if(changeStatus == "Pasif" )status = "stop"         
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
        
        const response = await axios.get(`http://localhost:${dbPort}/api/logs`, {
            params: {
                page,
                limit,
                search,
                sortField,
                sortDirection
            }
        });

        return {
            data: response.data || [],
            totalPages: response.headers['x-total-pages'] || 1,
            total: response.headers['x-total-count'] || response.data.length
        };
    } catch (error) {
        console.error('Erişim logları çekilirken bir hata oluştu:', error);
        throw error;
    }
}



