import React, { useState, useEffect } from 'react';
import { Segment, Header, Table, Button, Icon, Grid, Divider, Popup } from 'semantic-ui-react';
import { fetchIsApacheActive, setApacheStatus, fetchServerIp, fetchOS, fetchOSVersion, fetchApacheVersion, fetchPHPVersion, fetchMySQLVersion, fetchIsMySQLActive, fetchIsSystemActive } from '../../../utils/api.jsx'
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
    }, []);

    const toggleApacheStatus = async () => {
        setLoading(true);
        try {
            const newStatus = isApacheActive === 'Aktif' ? 'Pasif' : 'Aktif';
            await setApacheStatus(newStatus);
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

    function getDescription(type) {
        const descriptions = {
            'Web Sunucusu (Apache)': 'NextWAF\'ın koruduğu websitenizin iletişim servisidir.',
            'Sunucu IP Adresi': 'Müşterilerinizin websitenize erişim sağlayabileceği IP adresi.',
            'İşletim Sistemi': 'Websitenizi barındıran sunucunun işletim sistemi.',
            'Kernel Sürümü': 'Websitenizi barındıran sunucunun çekirdek sürümü.',
            'Apache Sürümü': 'Websitenizin iletişim servisi olan Apache sunucusunun sürümü.',
            'PHP Sürümü': 'NextWAF\'ın çekirdek iletişiminde kullandığı PHP\'nin sürümü.',
            'MySQL Servisi': 'Websitenizin veritabanı servisi olan MySQL\'in durumu.',
            'MySQL Sürümü': 'Websitenizin veritabanı servisi olan MySQL\'in sürümü.',
            'Sistem İletişim Servisi': 'NextWAF\'ın çekirdek iletişim servisi durumu.'
        }; //Bir hata durumunda işletim sistemi ve sürümü işe yarar.

        return descriptions[type] || 'açıklama girilmemiş.';
    }

    return (
        <div className="sistem-page">
            <Grid stackable>
                <Grid.Row>
                    <Grid.Column width={16}>
                        <Segment className="component">
                            <Header as='h2'>Sunucu Servisi</Header>
                            <Divider />

                            <Table celled className="server-table">
                                <Table.Body>
                                    <Table.Row>
                                        <Table.Cell width={6} className="service-name">
                                            <Popup
                                                content={getDescription("Web Sunucusu (Apache)")}
                                                trigger={<span className="helper">Web Sunucusu (Apache)</span>}
                                            />
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

                            {isSystemActive === "Pasif" || isApacheActive === "Pasif" && <div className="info-box">
                                {isSystemActive === 'Pasif' && (<p style={{ color: "red", fontStyle: "normal" }}>
                                    <Icon name="info circle" />
                                    <strong>Sistem iletişimi Pasif durumda, yöneticinizle iletişime geçiniz!</strong>
                                </p>)}
                                {isApacheActive === 'Pasif' && (<p style={{ color: "red", fontStyle: "normal" }}>
                                    <Icon name="info circle" />
                                    Şu an websitenize erişim kapalı! geri açmak için <strong>Aktifleştir</strong>'e basınız.
                                </p>)}
                            </div>}
                        </Segment>
                    </Grid.Column>
                </Grid.Row>

                <Grid.Row>
                    <Grid.Column width={16}>
                        <Segment className="component">
                            <Header as='h2'>Sunucu Bilgisi</Header>
                            <Divider />

                            <Grid columns={2} stackable style={{ justifyContent: 'space-between' }}>
                                <Grid.Column>
                                    <Table definition className="info-table">
                                        <Table.Body>
                                            <Table.Row>
                                                <Table.Cell width={6}>
                                                    <Popup
                                                        content={getDescription("Sunucu IP Adresi")}
                                                        trigger={<span className="helper">Sunucu IP Adresi</span>}
                                                    />


                                                </Table.Cell>
                                                <Table.Cell><strong>{serverIp}</strong></Table.Cell>
                                            </Table.Row>
                                            <Table.Row>
                                                <Table.Cell>
                                                    <Popup
                                                        content={getDescription("İşletim Sistemi")}
                                                        trigger={<span className="helper">İşletim Sistemi</span>}
                                                    />
                                                </Table.Cell>
                                                <Table.Cell><strong>{os}</strong></Table.Cell>
                                            </Table.Row>
                                            <Table.Row>
                                                <Table.Cell>
                                                <Popup
                                                        content={getDescription("Kernel Sürümü")}
                                                        trigger={<span className="helper">Kernel Sürümü</span>}
                                                    />
                                                    </Table.Cell>
                                                <Table.Cell><strong>{osVersion}</strong></Table.Cell>
                                            </Table.Row>
                                            <Table.Row>
                                                <Table.Cell>
                                                <Popup
                                                        content={getDescription("Sistem İletişim Servisi")}
                                                        trigger={<span className="helper">Sistem İletişim Servisi</span>}
                                                    />
                                                    </Table.Cell>
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
                                                <Table.Cell width={6}>
                                                <Popup
                                                        content={getDescription("Apache Sürümü")}
                                                        trigger={<span className="helper">Apache Sürümü</span>}
                                                    />
                                                    </Table.Cell>
                                                <Table.Cell><strong>{apacheVersion}</strong></Table.Cell>
                                            </Table.Row>
                                            <Table.Row>
                                                <Table.Cell>
                                                <Popup
                                                        content={getDescription("PHP Sürümü")}
                                                        trigger={<span className="helper">PHP Sürümü</span>}
                                                    />
                                                    </Table.Cell>
                                                <Table.Cell><strong>{PHPVersion}</strong></Table.Cell>
                                            </Table.Row>
                                            <Table.Row>
                                                <Table.Cell>
                                                <Popup
                                                        content={getDescription("MySQL Servisi")}
                                                        trigger={<span className="helper">MySQL Servisi</span>}
                                                    />
                                                    </Table.Cell>
                                                <Table.Cell><strong className={`status-text ${getStatusColor(isMySQLActive)}`}>
                                                    {isMySQLActive}</strong></Table.Cell>
                                            </Table.Row>
                                            <Table.Row>
                                                <Table.Cell>
                                                <Popup
                                                        content={getDescription("MySQL Sürümü")}
                                                        trigger={<span className="helper">MySQL Sürümü</span>}
                                                    />
                                                    </Table.Cell>
                                                <Table.Cell><strong>{MySQLVersion}</strong></Table.Cell>
                                            </Table.Row>
                                        </Table.Body>
                                    </Table>
                                </Grid.Column>
                                {isSystemActive === "Aktif" && <div className="info-box-bottom">
                                    <p>
                                        <Icon name="info circle" />
                                        Sistem İletişim Servisi <strong>Pasif</strong> durumunda olduğunda, derhal sunucu yöneticinizle iletişime geçiniz.
                                    </p>
                                </div>}
                            </Grid>
                        </Segment>
                    </Grid.Column>
                </Grid.Row>
            </Grid>
        </div>
    );
}

export default Sistem;
