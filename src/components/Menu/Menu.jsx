import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './Menu.css';
import { getCookieJSON, removeCookie } from '../../utils/cookie';
import { logout } from '../../utils/api';
import i_profile from "../../assets/icons/i_profile.svg";
import i_logout from "../../assets/icons/i_logout.svg";
import i_settings from "../../assets/icons/i_settings.svg";
import i_profiles from "../../assets/icons/i_profiles.svg";
import i_arrow_down from "../../assets/icons/i_arrow_down.svg";

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

    const handleLogout = async () => {
        try {
            const user = getCookieJSON("user");
            if (user) {
                await logout(user.username);
            }
        } catch (error) {
            console.error("Çıkış yaparken hata oluştu:", error);
        } finally {
            removeCookie('user');
            window.location.href = "/login";
        }
    };

    const toggleDropdown = () => {
        setDropdownOpen(!dropdownOpen);
    };

    return (
        <div className="modern-menu ui">
            <div className="menu-logo">
                <img src="/src/assets/logo.png" alt="Logo" />
            </div>
            <div className="menu-items">
                <div className="menu-item user-info" onClick={toggleDropdown}>
                    <strong id='username_text'>{username}</strong>
                    <img src={i_arrow_down} id='arrow_icon' />
                    {dropdownOpen && (
                        <div className="dropdown-content">
                            <Link to="/waf/profiles" className="dropdown-item" onClick={() => setDropdownOpen(false)}>
                                <img src={i_profiles} className='menu_icon' />
                                Profiller
                            </Link>
                            <div className="dropdown-item" onClick={handleLogout}>
                                <img src={i_logout} className='menu_icon' />
                                Güvenli Çıkış Yap
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Menu;
