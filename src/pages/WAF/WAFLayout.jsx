import React, { useEffect, useState } from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import './WAF.css';
import { Icon } from 'semantic-ui-react';
import Menu from '../../components/Menu/Menu';
import { getCookieJSON } from '../../utils/cookie';
import i_health from '../../assets/icons/i_health.svg';
/**
 * WAF sayfa düzeni bileşeni - tüm WAF sayfaları için ortak üst ve sol menü içerir
 */
function WAFLayout() {
    const [username, setUsername] = useState('');
    const location = useLocation();

    useEffect(() => {
        const user = getCookieJSON("user");
        if (user === null) {
            alert("Sayfayı görüntülemek için giriş yapmalısınız.");
            window.location.href = "/login";
        } else {
            setUsername(user.username);
        }
    }, []);

    // URL'ye göre aktif menü öğesini belirleme
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
                            to="/waf/system-health" 
                            className={`sidebar-item ${isActive('/waf/system-health') ? 'active' : ''}`}
                        >
                            <img src={i_health} alt="Sistem Sağlığı" className='icon' />
                            <span>Durum Paneli</span>
                        </Link>
                        <Link 
                            to="/waf/tests" 
                            className={`sidebar-item ${isActive('/waf/tests') ? 'active' : ''}`}
                        >
                            <Icon name="lab" />
                            <span>Denemeler</span>
                        </Link>
                        {/* Diğer menü öğeleri burada eklenebilir */}
                        <Link to="/alerts" className="sidebar-item">
                            <Icon name="warning" />
                            <span>Alarmlar</span>
                        </Link>
                        <Link to="/rules" className="sidebar-item">
                            <Icon name="list" />
                            <span>Kurallar</span>
                        </Link>
                        <Link to="/settings" className="sidebar-item">
                            <Icon name="settings" />
                            <span>Ayarlar</span>
                        </Link>
                    </div>
                </div>

                {/* Ana İçerik - child route'a göre değişir */}
                <div className="main-content">
                    <Outlet />
                </div>
            </div>
        </div>
    );
}

export default WAFLayout;
