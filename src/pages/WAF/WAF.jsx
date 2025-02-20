import { useEffect, useState } from 'react';
import './WAF.css'
import 'semantic-ui-css/semantic.min.css'
import { getCookieJSON, removeCookie } from '../../utils/cookie';
import Menu from '../../components/Menu/Menu';

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

    return (
        <div id="background">
            <Menu />
            {/* Diğer içerikler */}
        </div>
    );
}

export default WAF;