import React, { useEffect, useState } from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import './WAFLayout.css';
import { Icon } from 'semantic-ui-react';
import Menu from '../../../components/Menu/Menu';
import { getCookieJSON } from '../../../utils/cookie';
import i_health from '../../../assets/icons/i_health.svg';
import i_monitor from '../../../assets/icons/i_monitor.svg';
import i_settings from '../../../assets/icons/i_settings.svg';

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
                            <span>Sistem Sağlığı</span>
                        </Link>
                        <Link 
                            to="/waf/tests" 
                            className={`sidebar-item ${isActive('/waf/tests') ? 'active' : ''}`}
                        >
                            <img src={i_monitor} alt="Loglar" className='icon' />
                            <span>Loglar</span>
                        </Link>
                        {/* Diğer menü öğeleri burada eklenebilir */}
                        <Link to="/waf/settings" className="sidebar-item">
                            <img src={i_settings} className='icon' />
                            <span>Ayarlar</span>
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
