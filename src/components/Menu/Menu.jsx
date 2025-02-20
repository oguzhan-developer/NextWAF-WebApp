import { useState, useEffect } from 'react';
import './Menu.css';
import { getCookieJSON, removeCookie } from '../../utils/cookie';

function Menu() {
    const [username, setUsername] = useState('');
    const [dropdownOpen, setDropdownOpen] = useState(false);

    useEffect(() => {
        const user = getCookieJSON("user");
        if (user) {
            setUsername(user.username);
        }
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (!event.target.closest('.user-info')) {
                setDropdownOpen(false);
            }
        };

        document.addEventListener('click', handleClickOutside);
        return () => {
            document.removeEventListener('click', handleClickOutside);
        };
    }, []);

    const handleLogout = () => {
        removeCookie('user');
        window.location.href = "/login";
    };

    const toggleDropdown = () => {
        setDropdownOpen(!dropdownOpen);
    };

    return (
        <div className="modern-menu">
            <div className="menu-logo">
                <img src="/src/assets/logo.png" alt="Logo" />
            </div>
            <div className="menu-items">
                <div className="menu-item user-info" onClick={toggleDropdown}>
                    {username} <i className="angle down icon"></i>
                    {dropdownOpen && (
                        <div className="dropdown-content">
                            <div className="dropdown-item">Profil</div>
                            <div className="dropdown-item">Ayarlar</div>
                            <div className="dropdown-item" onClick={handleLogout}>Çıkış Yap</div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Menu;
