import React, { useEffect, useState } from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import './WAFLayout.css'
import { Icon } from 'semantic-ui-react';
import Menu from '../../../components/Menu/Menu';
import { getCookieJSON } from '../../../utils/cookie';
import i_status from '../../../assets/icons/i_status.svg';
import i_cpu from '../../../assets/icons/i_cpu.svg';
import i_logs from '../../../assets/icons/i_logs.svg';
import i_security from '../../../assets/icons/i_security.svg';

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
                            to="/waf/dashboard" 
                            className={`sidebar-item ${isActive('/waf/dashboard') ? 'active' : ''}`}
                        >
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
                        <span>Sızma Girişimleri</span>
                        </Link>
                        <Link to="#" className="sidebar-item">
                            <Icon name="list" />
                            <span>Kurallar</span>
                        </Link>
                        <Link to="#" className="sidebar-item">
                            <Icon name="settings" />
                            <span>Ayarlar</span>
                        </Link>
                    </div>
                </div>

                {/* Ana İçerik - Outlet ile alt route'ların içeriği burada gösterilir */}
                <div className="main-content">
                    <Outlet />
                </div>
            </div>
        </div>
    );
}

export default WAFLayout;
