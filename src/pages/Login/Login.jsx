import { useState } from 'react';
import axios from 'axios';
import './Login.css'
import 'semantic-ui-css/semantic.min.css'
import { Button, Image } from 'semantic-ui-react'
import { config } from '../../config.js'
import { getCookie, getCookieJSON, setCookie } from '../../utils/cookie';

function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault()
        try {
            let response = await axios.post(`http://${config.apiHost}:${config.apiPort}/api/login`, { username, password });
            if (response.data.success) {
               response = await axios.get(`http://${config.apiHost}:${config.apiPort}/api/user/${response.data.username}`);
                console.log("kullanıcı ", response.data.user);
                setCookie('user', JSON.stringify(response.data.user), { expires: 1 });
                window.location.href = "/waf";
                
                
            } else {
                console.log('Giriş Başarısız!')
            }
        } catch (error) {
            console.error('Giriş yaparken hata oluştu:', error)
        }
    }
    return (
        <div id="background">
            <div id='content'>
                <Image src="/src/assets/logo.png" id="logo" />
                <h2 id='alt_baslik'>{import.meta.env.VITE_APP_SUBNAME} <span id='version'>{import.meta.env.VITE_APP_VERSION}</span></h2>
                <div id='container'>
                    <div style={{ display: "flex", flexDirection: "column", transition: "all 0.5s ease", alignItems: "center", marginTop: "-3rem" }}>
                        <label id='top_label_login'>Yönetici Girişi</label>
                        <form id='form' onSubmit={handleLogin}>
                            <input className='input' placeholder='Kullanıcı Adı' label="Kullanıcı Adı" value={username} onChange={(e) => setUsername(e.target.value)} />
                            <input className='input' placeholder='Parola' label="Parola" value={password} onChange={(e) => setPassword(e.target.value)} />
                            <Button size='small' color='teal' id='login_btn' type='submit'>Giriş yap</Button>
                        </form>
                    </div>
                    <div>
                        <Image src="/src/assets/figure-01.jpg" id='figure' />
                    </div>
                </div>
                <div>
                </div>

            </div>
        </div >
    );

}

export default Login;