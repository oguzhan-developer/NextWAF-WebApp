import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Segment, Header, Form, Button, Checkbox, Divider, Icon, Message } from 'semantic-ui-react';
import { fetchProfileDetails, updateProfile, createProfile } from '../../../utils/api';
import './Profiles.css';
import { getCookieJSON, setCookie } from '../../../utils/cookie';

function EditProfile() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isNewProfile = id === undefined;
    
    const [profile, setProfile] = useState({
        username: '',
        email: '',
        full_name: '',
    });
    
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [changePassword, setChangePassword] = useState(isNewProfile);
    const [loading, setLoading] = useState(!isNewProfile);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        if (!isNewProfile) {
            loadProfile();
        }
    }, [id]);

    const loadProfile = async () => {
        try {
            setLoading(true);
            const profileData = await fetchProfileDetails(id);
            setProfile(profileData);
            console.log(profileData);
            
        } catch (error) {
            setError('Profil bilgileri yüklenirken hata oluştu.');
            console.error('Profil detayı alınırken hata:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e, { name, value }) => {
        setProfile(prev => ({ ...prev, [name]: value }));
    };

    const validateForm = () => {
        if (!profile.username) {
            setError('Kullanıcı adı zorunludur.');
            return false;
        }

        if (changePassword) {
            if (!password) {
                setError('Şifre alanı zorunludur.');
                return false;
            }
            
            if (password !== confirmPassword) {
                setError('Şifreler eşleşmiyor.');
                return false;
            }
        }

        return true;
    };

    const handleSubmit = async () => {
        setError('');
        setSuccess('');
        
        if (!validateForm()) return;
        
        try {
            setLoading(true);
            
            const profileData = { ...profile };
            if (changePassword) {
                profileData.password = password;
            }else {
                delete profileData.password; // Parola değiştirilmiyecekse db ye gönderilmemesi gerekiyor, çünkü her update fonks çağrıldığında parolayı güncelliyor. Tekrar tekrar hashlenmesine sebep oluyor.
                console.log("buraya girdi");
                
            }
            
            if (isNewProfile) {
                await createProfile(profileData);
                setSuccess('Profil başarıyla oluşturuldu.');
            } else {
                console.log("profileData", profileData);
                
                await updateProfile(id, profileData);
                setSuccess('Profil başarıyla güncellendi.');
                const currentUser = getCookieJSON('user');
                const newUser = {...currentUser, ...profileData}
                setCookie('user', JSON.stringify(newUser), { expires: 1 });
            }
            
            setTimeout(() => {
                navigate('/waf/profiles');
            }, 1500);
            
        } catch (error) {
            setError('İşlem sırasında bir hata oluştu.');
            console.error('Profil kaydetme hatası:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="profiles-page">
            <Segment className="component">
                <div className="profile-header">
                    <Header as="h2">{isNewProfile ? 'Yeni Profil Oluştur' : 'Profil Düzenle'}</Header>
                </div>
                
                <Divider />
                
                <Link to="/waf/profiles" className="back-button">
                    <Button labelPosition="left">
                        <Icon name="arrow left" />
                        Geri Dön
                    </Button>
                </Link>
                
                {error && (
                    <Message negative>
                        <Message.Header>Hata</Message.Header>
                        <p>{error}</p>
                    </Message>
                )}
                
                {success && (
                    <Message positive>
                        <Message.Header>Başarılı</Message.Header>
                        <p>{success}</p>
                    </Message>
                )}
                
                <Form className="profile-form" loading={loading}>
                    <Form.Input 
                        label="Kullanıcı Adı"
                        placeholder="Kullanıcı adını girin"
                        name="username"
                        value={profile.username || ''}
                        onChange={handleChange}
                        required
                    />
                    
                    <Form.Input 
                        label="E-posta"
                        placeholder="E-posta adresini girin"
                        name="email"
                        type="email"
                        value={profile.email || ''}
                        onChange={handleChange}
                    />
                    
                    <Form.Input 
                        label="Ad Soyad"
                        placeholder="Ad ve soyad girin"
                        name="full_name"
                        value={profile.full_name || ''}
                        onChange={handleChange}
                    />
                    
                    {!isNewProfile && (
                        <div className="change-password-toggle">
                            <Checkbox 
                                label="Parolayı Değiştir"
                                checked={changePassword}
                                onChange={(e, data) => setChangePassword(data.checked)}
                            />
                        </div>
                    )}
                    
                    {changePassword && (
                        <>
                            <Form.Input 
                                label="Şifre"
                                placeholder="Şifre girin"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required={changePassword}
                            />
                            
                            <Form.Input 
                                label="Şifre Tekrar"
                                placeholder="Şifreyi tekrar girin"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                error={password !== confirmPassword && confirmPassword !== ''}
                                required={changePassword}
                            />
                        </>
                    )}
                    
                    <div className="form-buttons">
                        <Button onClick={() => navigate('/waf/profiles')}>
                            İptal
                        </Button>
                        <Button 
                            primary 
                            onClick={handleSubmit}
                            loading={loading}
                        >
                            {isNewProfile ? 'Oluştur' : 'Kaydet'}
                        </Button>
                    </div>
                </Form>
            </Segment>
        </div>
    );
}

export default EditProfile;
