import axios from 'axios';
//pass rootroot
const port = import.meta.env.VITE_APP_API_PORT || 5058;
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

export const fetchServerStats = async () => {
    try {
        const response = await axios.get(`http://localhost:${port}/api/server-stats`);
        return response.data.stats;
    } catch (error) {
        console.error('Sunucu istatistiklerini çekerken hata oluştu:', error);
        throw error;
    }
};
