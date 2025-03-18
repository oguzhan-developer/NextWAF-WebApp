import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Segment, Header, Table, Button, Icon, Loader, Divider, Confirm, Message, Label } from 'semantic-ui-react';
import { fetchUsers, deleteUser } from '../../../utils/api';
import { getCookieJSON, removeCookie } from '../../../utils/cookie'; 
import './Profiles.css';

function Profiles() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState(null);
    const [message, setMessage] = useState({ content: '', type: '' });
    const [currentUser, setCurrentUser] = useState(null); 

    useEffect(() => {
        loadProfiles();
        
        const user = getCookieJSON("user");
        if (user) {
            setCurrentUser(user);
        }
    }, []);

    const loadProfiles = async () => {
        try {
            setLoading(true);
            setUsers(await fetchUsers());
        } catch (error) {
            console.error('Profiller yüklenirken hata oluştu:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteClick = (id) => {
        setSelectedUserId(id);
        setConfirmOpen(true);
    };

    const handleConfirmDelete = async () => {
        try {
            setLoading(true);
            const result = await deleteUser(selectedUserId);
            
            if (result.success) {
                setMessage({
                    content: 'Kullanıcı başarıyla silindi',
                    type: 'success'
                });
                
                if (currentUser && currentUser.id === selectedUserId) {
                    setTimeout(() => {
                        removeCookie('user');
                        window.location.href = "/login"; 
                    }, 1500);
                    
                    setMessage({
                        content: 'Hesabınız silindi, çıkış yapılıyor...',
                        type: 'success'
                    });
                } else {
                    setTimeout(() => {
                        setMessage({ content: '', type: '' });
                    }, 1600);
                    
                    loadProfiles();
                }
            } else {
                setMessage({
                    content: result.message || 'Kullanıcı silinirken bir hata oluştu',
                    type: 'error'
                });
            }
        } catch (error) {
            setMessage({
                content: 'Kullanıcı silinirken bir hata oluştu',
                type: 'error'
            });
            console.error('Kullanıcı silinirken hata:', error);
        } finally {
            setConfirmOpen(false);
            setLoading(false);
        }
    };

    const handleCancelDelete = () => {
        setConfirmOpen(false);
        setSelectedUserId(null);
    };

    const formatDateTime = (timestamp) => {
        if (!timestamp) return 'Hiç giriş yapmadı';
        
        const date = new Date(timestamp);
        return new Intl.DateTimeFormat('tr-TR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        }).format(date);
    };

    return (
        <div className="profiles-page">
            <Segment className="component">
                <div className="profile-header">
                    <Header as="h2">Kullanıcı Profilleri</Header>
                    <div>
                        <Link to="/waf/profiles/new">
                            <Button primary>
                                <Icon name="plus" />
                                Yeni Profil
                            </Button>
                        </Link>
                    </div>
                </div>
                
                <Divider />
                
                {message.content && (
                    <Message
                        positive={message.type === 'success'}
                        negative={message.type === 'error'}
                        onDismiss={() => setMessage({ content: '', type: '' })}
                    >
                        <Message.Header>
                            {message.type === 'success' ? 'İşlem Başarılı' : 'Hata'}
                        </Message.Header>
                        <p>{message.content}</p>
                    </Message>
                )}
                
                <p className="section-description">
                    Sisteme erişimi olan kullanıcı hesapları
                </p>

                <div className="table-container">
                    <Table celled className="profile-table">
                        <Table.Header>
                            <Table.Row>
                                <Table.HeaderCell>ID</Table.HeaderCell>
                                <Table.HeaderCell>Ad Soyad</Table.HeaderCell>
                                <Table.HeaderCell>Kullanıcı Adı</Table.HeaderCell>
                                <Table.HeaderCell>E-posta</Table.HeaderCell>
                                <Table.HeaderCell>Kayıt Olma Tarihi</Table.HeaderCell>
                                <Table.HeaderCell>Son Giriş Tarihi</Table.HeaderCell>
                                <Table.HeaderCell>Durum</Table.HeaderCell>
                                <Table.HeaderCell>Aksiyon</Table.HeaderCell>
                            </Table.Row>
                        </Table.Header>

                        <Table.Body>
                            {loading ? (
                                <Table.Row>
                                    <Table.Cell colSpan="8" textAlign="center">
                                        <div className="loading-indicator">
                                            <Loader active inline="centered" />
                                            Profiller yükleniyor...
                                        </div>
                                    </Table.Cell>
                                </Table.Row>
                            ) : users.length === 0 ? (
                                <Table.Row>
                                    <Table.Cell colSpan="8" textAlign="center">
                                        Hiç kullanıcı profili bulunamadı.
                                    </Table.Cell>
                                </Table.Row>
                            ) : (
                                users.map(profile => (
                                    <Table.Row key={profile.id} className={profile.active ? "active-user-row" : ""}>
                                        <Table.Cell>{profile.id}</Table.Cell>
                                        <Table.Cell>{profile.full_name || '-'}</Table.Cell>
                                        <Table.Cell>{profile.username}</Table.Cell>
                                        <Table.Cell>{profile.email || '-'}</Table.Cell>
                                        <Table.Cell className='last-login'>
                                                {formatDateTime(profile.olusturulma)}
                                        </Table.Cell>
                                        <Table.Cell className="last-login">
                                            {formatDateTime(profile.son_giris)}
                                        </Table.Cell>
                                        <Table.Cell>
                                            {profile.active ? (
                                                <Label color='green' className="status-label">
                                                    Aktif
                                                </Label>
                                            ) : (
                                                <Label className="status-label" color='grey'>
                                                    Çevrimdışı
                                                </Label>
                                            )}
                                        </Table.Cell>
                                        <Table.Cell>
                                            <div className="profile-actions">
                                                <Link to={`/waf/profiles/edit/${profile.id}`}>
                                                    <Button size="small" primary>
                                                        Düzenle
                                                    </Button>
                                                </Link>
                                                <Button 
                                                    size="small" 
                                                    basic 
                                                    color="red"
                                                    onClick={() => handleDeleteClick(profile.id)}
                                                    disabled={users.length === 1}
                                                    title={users.length === 1 ? "Son kullanıcı silinemez" : ""}
                                                >
                                                    Kaldır
                                                </Button>
                                            </div>
                                        </Table.Cell>
                                    </Table.Row>
                                ))
                            )}
                        </Table.Body>
                    </Table>
                </div>
                
                <Confirm
                    open={confirmOpen}
                    header="Kullanıcı Silme"
                    content={
                        currentUser && currentUser.id === selectedUserId 
                            ? "Kendi hesabınızı silmek istediğinize emin misiniz? Bu işlem sonrasında otomatik olarak çıkış yapılacaktır."
                            : "Bu kullanıcıyı silmek istediğinize emin misiniz? Bu işlem geri alınamaz!"
                    }
                    confirmButton={
                        currentUser && currentUser.id === selectedUserId 
                            ? "Evet, Hesabımı Sil ve Çıkış Yap"
                            : "Evet, Sil"
                    }
                    cancelButton="İptal"
                    onCancel={handleCancelDelete}
                    onConfirm={handleConfirmDelete}
                    size={currentUser && currentUser.id === selectedUserId ? "small" : "mini"}
                    className={currentUser && currentUser.id === selectedUserId ? "wider-confirm-dialog" : ""}
                />
            </Segment>
        </div>
    );
}

export default Profiles;
