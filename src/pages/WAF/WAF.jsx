import { useEffect, useState } from 'react';
import './WAF.css'
import 'semantic-ui-css/semantic.min.css'
import { getCookieJSON, removeCookie } from '../../utils/cookie';
import { Image, Dropdown } from 'semantic-ui-react';

function WAF() {
    const [username, setUsername] = useState('');

    useEffect(() => {
        const user = getCookieJSON("user");
        if (user === null) {
            alert("Sayfayı görüntülemek için giriş yapmalısınız.");
            window.location.href = "/login";
        } else {
            setUsername(user.username);
        }
    }, []);

    const handleLogout = () => {
        removeCookie('user');
        window.location.href = "/login";
    };

    const trigger = (
        <span id="user-info">{username}</span>
    );

    const options = [
        { key: 'logout', text: 'Çıkış Yap', onClick: handleLogout },
    ];

    return (
        <div id="background">
            <div id="menu-bar">
                <div id="menu-content">
                    <span id="menu-logo"><Image src="/src/assets/logo.png" /></span>
                    <Dropdown trigger={trigger} options={options} pointing='top right' icon={null} />
                </div>
            </div>
        </div>
    );
}

export default WAF;