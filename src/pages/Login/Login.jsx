import './Login.css'
import 'semantic-ui-css/semantic.min.css'
import { Button, Image } from 'semantic-ui-react'

function Login() {

    return (
        <div id="background">
            <div id='content'>
                <Image src="/src/assets/logo.png" id="logo" />
                <h2 id='alt_baslik'>{import.meta.env.VITE_APP_SUBNAME} <span id='version'>{import.meta.env.VITE_APP_VERSION}</span></h2>
                <div id='container'>
                    <div style={{ display: "flex", flexDirection: "column", transition: "all 0.5s ease", alignItems: "center", marginTop: "-3rem" }}>
                        <label id='top_label_login'>Yönetici Girişi</label>
                        <form id='form'>
                            <input className='input' placeholder='Kullanıcı Adı' label="Kullanıcı Adı" />
                            <input className='input' placeholder='Parola' label="Parola" />
                            <Button size='small' color='teal' id='login_btn'>Giriş yap</Button>
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