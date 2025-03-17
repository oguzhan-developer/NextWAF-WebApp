import React, { useEffect, useState } from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import './WAFLayout.css'
import Menu from '../../../components/Menu/Menu';
import { getCookieJSON } from '../../../utils/cookie';
import i_status from '../../../assets/icons/i_status.svg';
import i_cpu from '../../../assets/icons/i_cpu.svg';
import i_logs from '../../../assets/icons/i_logs.svg';
import i_security from '../../../assets/icons/i_security.svg';
import i_shield from '../../../assets/icons/i_health.svg';
import i_firewall from '../../../assets/icons/i_firewall.svg'; // Ekleyeceğiniz ikon
import { fetchIsSystemActive, fetchIDSLogs } from '../../../utils/api';

function WAFLayout() {
    const [isSystemActive, setIsSystemActive] = useState(false);
    const [username, setUsername] = useState('');
    const [uncheckedLogs, setUncheckedLogs] = useState(0);
    const location = useLocation();

    useEffect(() => {
        const loadSystemStatus = async () => {
            setIsSystemActive(await fetchIsSystemActive());
        }
        
        const loadIDSLogs = async () => {
            try {
                const logsData = await fetchIDSLogs();
                const uncheckedCount = logsData.filter(log => !log.checked).length;
                setUncheckedLogs(uncheckedCount);
                
                // Kontrol edilmemiş log varsa ve /waf/ids sayfasında değilsek uyarı ver
                if (uncheckedCount > 0 && location.pathname !== '/waf/ids') {
                    alert(`Dikkat! ${uncheckedCount} adet kontrol edilmemiş güvenlik ihlali logu bulunmaktadır. Lütfen "Sızma Girişimleri" sayfasını kontrol ediniz.`);
                }
            } catch (error) {
                console.error('IDS logları kontrol edilirken hata oluştu:', error);
            }
        }
        
        const load = async () => {
            await loadSystemStatus();
            await loadIDSLogs();
        }
        
        load();
        
        const user = getCookieJSON("user");
        if (user === null) {
            alert("Sayfayı görüntülemek için giriş yapmalısınız.");
            window.location.href = "/login";
        } else {
            setUsername(user.username);
        }
        
        // Her 5 dakikada bir IDS loglarını kontrol et
        const interval = setInterval(loadIDSLogs, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, [location.pathname]);

    useEffect(() => {
        if (isSystemActive == "Pasif") alert("Sistem İletişimi Pasif, Yöneticinizle iletişime geçiniz!");
    }, [isSystemActive])

    const isActive = (path) => {
        return location.pathname === path;
    };

    return (
        <div id="background">
            <Menu />

            <div className="page-container">
                <div className="sidebar">
                    <div className="sidebar-menu">
                        <Link
                            to="/waf/dashboard"
                            className={`sidebar-item ${isActive('/waf/dashboard') ? 'active' : ''}`}>
                            <img src={i_status} alt="Durum Paneli" className='icon' />
                            <span>Durum Paneli</span>
                        </Link>
                        <Link to="/waf/system" className={`sidebar-item ${isActive('/waf/system') ? 'active' : ''}`}>
                            <img src={i_cpu} alt="Sistem" className='icon' />
                            <span>Sistem</span>
                        </Link>
                        <Link to="/waf/logs" className={`sidebar-item ${isActive('/waf/logs') ? 'active' : ''}`}>
                            <img src={i_logs} alt="Loglar" className='icon' />
                            <span>Loglar</span>
                        </Link>
                        <Link to="/waf/ids" className={`sidebar-item ${isActive('/waf/ids') ? 'active' : ''}`}>
                            <img src={i_security} alt="Sızma Girişimleri" className='icon' />
                            <span className='ids-text'>
                                Sızma Girişimleri
                                {uncheckedLogs > 0 && (
                                    <span className="notification-badge">{uncheckedLogs}</span>
                                )}
                            </span>
                        </Link>
                        <Link to="/waf/ipblock" className={`sidebar-item ${isActive('/waf/ipblock') ? 'active' : ''}`}>
                            <img src={i_firewall} alt="IP Engelleme" className='icon' />
                            <span>IP Engelleme</span>
                        </Link>
                    </div>
                </div>

                <div className="main-content">
                    <Outlet />
                </div>
            </div>
        </div>
    );
}
export default WAFLayout;
