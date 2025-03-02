import axios from 'axios';
//username: admin
//pass rootroot
const port = import.meta.env.VITE_APP_API_PORT || 5058;
const system_ip = import.meta.env.VITE_APP_SYSTEM_IP || '10.211.55.5';
const system_port = import.meta.env.VITE_APP_SYSTEM_PORT || '8080';
console.log(port);

export const fetchLogs = async () => {
    try {
        const response = await axios.get(`http://localhost:${port}/api/packets`);
        console.log(response.data.packets);
        
        return response.data.packets;
    } catch (error) {
        console.error('Logları çekerken hata oluştu:', error);
        throw error;
    }
};

export const fetchServerStats = async (limit) => {
    try {
        const response = await axios.get(`http://localhost:${port}/api/server-stats?limit=${limit}`);
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



