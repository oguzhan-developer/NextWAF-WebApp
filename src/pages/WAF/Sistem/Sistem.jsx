import React, { useState, useEffect } from 'react';
import { Segment, Header, Table, Button, Icon, Grid, Divider } from 'semantic-ui-react';
import { fetchIsApacheActive, setApacheStatus, fetchServerIp, fetchOS, fetchOSVersion, fetchApacheVersion, fetchPHPVersion, fetchMySQLVersion, fetchIsSystemActive, fetchIsMySQLActive } from '../../../utils/api.jsx'
import './Sistem.css';

function Sistem() {
    const [isSystemActive, setIsSystemActive] = useState('Getiriliyor...');
    const [isMySQLActive, setIsMySQLActive] = useState('Getiriliyor...');
    const [os, setOS] = useState('Getiriliyor...');
    const [osVersion, setOSVersion] = useState('Getiriliyor...');
    const [apacheVersion, setApacheVersion] = useState('Getiriliyor...');
    const [PHPVersion, setPHPVersion] = useState('Getiriliyor...');
    const [MySQLVersion, setMySQLVersion] = useState('Getiriliyor...');
    const [isApacheActive, setIsApacheActive] = useState('Kontrol ediliyor...');
    const [loading, setLoading] = useState(false);
    const [serverIp, setServerIp] = useState('0.0.0.0');

    useEffect(() => {
        const loadData = async () => {
            try {
                setIsSystemActive(await fetchIsSystemActive());
                const status = await fetchIsApacheActive();
                setIsApacheActive(status);

                const ip = await fetchServerIp();
                setServerIp(ip || '0.0.0.0');
                setOS(await fetchOS())
                setOSVersion(await fetchOSVersion())
                setApacheVersion(await fetchApacheVersion())
                setPHPVersion(await fetchPHPVersion())
                setMySQLVersion(await fetchMySQLVersion())
                setIsMySQLActive(await fetchIsMySQLActive())
            } catch (error) {
                console.error('Veri yüklenirken hata oluştu:', error);
                setIsApacheActive('Hata');
            }
        };

        loadData();
        if(isSystemActive == "Pasif")alert("Sistem İletişimi Pasif, Yöneticinizle iletişime geçiniz!");
    }, []);

    // Apache durumunu değiştirme fonksiyonu
    const toggleApacheStatus = async () => {
        setLoading(true);
        try {
            // Mevcut durumun tersini ayarla
            const newStatus = isApacheActive === 'Aktif' ? 'Pasif' : 'Aktif';
            
            // API'ye durum değişikliği gönder
            await setApacheStatus(newStatus);
            
            // Başarılı olursa state'i güncelle
            setIsApacheActive(newStatus);
        } catch (error) {
            console.error('Apache durumu değiştirilirken hata oluştu:', error);
            alert('İşlem sırasında bir hata oluştu!');
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status) => {
        if (status === 'Aktif') return 'green';
        if (status === 'Pasif') return 'red';
        return 'grey'; 
    };

        const getButtonProps = () => {
        if (isApacheActive === 'Aktif') {
            return {
                color: 'red',
                text: 'Pasifleştir',
                icon: 'power off'
            };
        } else {
            return {
                color: 'green',
                text: 'Aktifleştir',
                icon: 'power'
            };
        }
    };

    const buttonProps = getButtonProps();

    return (
        <div className="sistem-page">            
            <Grid stackable>
                <Grid.Row>
                    <Grid.Column width={16}>
                        <Segment className="component">
                            <Header as='h2'>Sunucu Servisleri</Header>
                            <Divider />
                            
                            <Table celled className="server-table">
                                <Table.Body>
                                    <Table.Row>
                                        <Table.Cell width={6} className="service-name">
                                            Web Sunucusu (Apache)
                                        </Table.Cell>
                                        <Table.Cell width={6}>
                                            <div className="status-container">
                                                <div className={`status-indicator ${getStatusColor(isApacheActive)}`}></div>
                                                <span>
                                                    <strong>Durum: </strong> 
                                                    <span className={`status-text ${getStatusColor(isApacheActive)}`}>
                                                        {isApacheActive}
                                                    </span>
                                                </span>
                                            </div>
                                        </Table.Cell>
                                        <Table.Cell width={4} textAlign="center" className="button-cell">
                                            <Button 
                                                color={buttonProps.color}
                                                onClick={toggleApacheStatus}
                                                loading={loading}
                                                disabled={loading}
                                                size="small"
                                            >
                                                <Icon name={buttonProps.icon} />
                                                {buttonProps.text}
                                            </Button>
                                        </Table.Cell>
                                    </Table.Row>
                                </Table.Body>
                            </Table>
                            
                            <div className="info-box">
                                {isApacheActive === 'Pasif' && (<p style={{color:"red",fontStyle:"normal"}}>
                                    <Icon name="info circle" />
                                    Şu an websitenize erişim kapalı! geri açmak için <strong>Aktifleştir</strong>'e basınız.
                                </p>) }
                                
                                <p>
                                    <Icon name="info circle" />
                                    NextWAF'ın koruduğu websitenin iletişim servisidir.
                                </p>
                            </div>
                        </Segment>
                    </Grid.Column>
                </Grid.Row>

                <Grid.Row>
                    <Grid.Column width={16}>
                        <Segment className="component">
                            <Header as='h2'>Sunucu Bilgisi</Header>
                            <Divider />
                            
                            <Grid columns={2} stackable style={{justifyContent: 'space-between'}}>
                                <Grid.Column>
                                    <Table definition className="info-table">
                                        <Table.Body>
                                            <Table.Row>
                                                <Table.Cell width={6}>Sunucu IP Adresi</Table.Cell>
                                                <Table.Cell><strong>{serverIp}</strong></Table.Cell>
                                            </Table.Row>
                                            <Table.Row>
                                                <Table.Cell>İşletim Sistemi</Table.Cell>
                                                <Table.Cell><strong>{os}</strong></Table.Cell>
                                            </Table.Row>
                                            <Table.Row>
                                                <Table.Cell>Kernel Sürümü</Table.Cell>
                                                <Table.Cell><strong>{osVersion}</strong></Table.Cell>
                                            </Table.Row>
                                            <Table.Row>
                                                <Table.Cell>Sistem İletişim Servisi</Table.Cell>
                                                <Table.Cell>
                                                    <strong className={`status-text ${getStatusColor(isSystemActive)}`}>
                                                    {isSystemActive}
                                                    </strong>
                                                </Table.Cell>
                                            </Table.Row>
                                        </Table.Body>
                                    </Table>
                                </Grid.Column>
                                <Grid.Column>
                                    <Table definition className="info-table">
                                        <Table.Body>
                                            <Table.Row>
                                                <Table.Cell width={6}>Apache Sürümü</Table.Cell>
                                                <Table.Cell><strong>{apacheVersion}</strong></Table.Cell>
                                            </Table.Row>
                                            <Table.Row>
                                                <Table.Cell>PHP Sürümü</Table.Cell>
                                                <Table.Cell><strong>{PHPVersion}</strong></Table.Cell>
                                            </Table.Row>
                                            <Table.Row>
                                                <Table.Cell>MySQL Servisi</Table.Cell>
                                                <Table.Cell><strong className={`status-text ${getStatusColor(isMySQLActive)}`}>
                                                    {isMySQLActive}</strong></Table.Cell>
                                            </Table.Row>
                                            <Table.Row>
                                                <Table.Cell>MySQL Sürümü</Table.Cell>
                                                <Table.Cell><strong>{MySQLVersion}</strong></Table.Cell>
                                            </Table.Row>
                                        </Table.Body>
                                    </Table>
                                </Grid.Column>
                                                <div className="info-box-bottom">
                                                    <p>
                                                        <Icon name="info circle" />
                                                        Sistem İletişim Servisi <strong>Pasif</strong> durumunda olduğunda, derhal sunucu yöneticinizle iletişime geçiniz.
                                                    </p>
                                                </div>
                            </Grid>
                        </Segment>
                    </Grid.Column>
                </Grid.Row>
            </Grid>
        </div>
    );
}

export default Sistem;
