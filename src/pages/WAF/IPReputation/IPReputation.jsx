import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Segment, Header, Table, Button, Icon, Loader, Message, Divider } from 'semantic-ui-react';
import { checkIPReputation } from '../../../utils/api'; 
import './IPReputation.css';

function IPReputation() {
    const navigate = useNavigate();
    const location = useLocation();
    const [ipAddress, setIpAddress] = useState('');
    const [loading, setLoading] = useState(false);
    const [ipInfo, setIpInfo] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const ip = params.get('ip');
        
        if (!ip) {
            setError("IP adresi belirtilmedi.");
            return;
        }
        
        setIpAddress(ip);
        
        fetchIPInfo(ip);
    }, [location]);

    const fetchIPInfo = async (ip) => {
        setLoading(true);
        setError('');
        
        try {
            const data = await checkIPReputation(ip);
            
            if (!data || !data.success) {
                throw new Error(data?.message || 'API yanıtı başarılı olmadı');
            }
            
            console.log('IP bilgileri başarıyla alındı');
            setIpInfo(data);
        } catch (error) {
            console.error('IP itibar bilgileri alınırken hata oluştu:', error);
            let errorMessage = 'IP itibar bilgileri alınırken bir hata oluştu';
            
            if (error.response) {
                errorMessage = `Sunucu hatası: ${error.response.status} - ${error.response?.data?.message || 'Bilinmeyen hata'}`;
            } else if (error.request) {
                errorMessage = 'Sunucu yanıt vermedi, lütfen internet bağlantınızı kontrol edin';
            } else {
                errorMessage = `İstek hatası: ${error.message}`;
            }
            
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        navigate('/waf/ipblock');
    };

    const getConfidenceColor = (confidence) => {
        if (confidence >= 80) return 'red';
        if (confidence >= 50) return 'orange';
        if (confidence >= 25) return 'yellow';
        return 'green';
    };
    
    const getRiskLevel = (abuseScore) => {
        if (abuseScore >= 80) return 'Çok Yüksek';
        if (abuseScore >= 50) return 'Yüksek';
        if (abuseScore >= 25) return 'Orta';
        if (abuseScore > 0) return 'Düşük';
        return 'Temiz';
    };
    
    const getRiskLevelColor = (abuseScore) => {
        if (abuseScore >= 80) return 'red';
        if (abuseScore >= 50) return 'orange';
        if (abuseScore >= 25) return 'yellow';
        return 'green';
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Bilgi yok';
        const date = new Date(dateString);
        return date.toLocaleString('tr-TR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const renderCategories = (categories) => {
        if (!categories || categories.length === 0) {
            return 'Rapor edilmiş kategori yok';
        }
        
        const categoryDescriptions = {
            1: 'DNS Zehirlenmesi',
            2: 'DNS İşleyicisi Aldatması',
            3: 'Sahtekarlık Siparişleri',
            4: 'DDoS Saldırısı',
            5: 'FTP İhlali',
            6: 'Ping Talebi',
            7: 'Sahtecilik',
            8: 'Aldatma',
            9: 'SQL Injection',
            10: 'E-posta Spam',
            11: 'Blog Spam',
            12: 'VoIP',
            13: 'Kanunsuz Erişim',
            14: 'SSH',
            15: 'IoT Hedef Alımı',
            16: 'CSRF',
            17: 'Port Tarama',
            18: 'Oltalama',
            19: 'Kötü Amaçlı Yazılım',
            20: 'RFI',
            21: 'Web Spam',
            22: 'Brute-Force',
            23: 'XSS'
        };
        
        return (
            <ul className="category-list">
                {categories.map(cat => (
                    <li key={cat}>
                        <span className="category-item">{categoryDescriptions[cat] || `Kategori #${cat}`}</span>
                    </li>
                ))}
            </ul>
        );
    };
    
    const blockAddress = () => {
        if (ipAddress) {
            navigate(`/waf/ipblock?block=${ipAddress}`);
        }
    };

    return (
        <div className="ipreputation-page">
            <Segment className="component">
                <div className="reputation-header">
                    <Button size='big' labelPosition="left" onClick={handleBack}>
                        <Icon name="arrow left" />
                        Geri Dön
                    </Button>
                </div>
                
                <Divider />
                
                {error && (
                    <Message negative onDismiss={() => setError('')}>
                        <Message.Header>Hata</Message.Header>
                        <p>{error}</p>
                    </Message>
                )}
                
                <div className="ip-target-container">
                    <Header as="h3">
                        <Icon name="search" />
                        <Header.Content>
                            Kontrol Edilen IP: <span className="ip-highlight">{ipAddress}</span>
                        </Header.Content>
                    </Header>
                </div>
                
                {loading ? (
                    <div className="loading-container">
                        <Loader active inline="centered" size="large">
                            IP bilgileri yükleniyor...
                        </Loader>
                    </div>
                ) : ipInfo ? (
                    <div className="results-container">
                        <div className="reputation-score-section">
                            <Header as="h3">AbuseIPDB Güvenlik Skoru</Header>
                            <div className={`score-circle ${getRiskLevelColor(ipInfo.abuse.abuseConfidenceScore)}`}>
                                <span className="score-text">{ipInfo.abuse.abuseConfidenceScore}</span>
                            </div>
                            <div className="score-description">
                                <p>
                                    Risk Seviyesi: 
                                    <span className={`risk-level ${getRiskLevelColor(ipInfo.abuse.abuseConfidenceScore)}`}>
                                        {getRiskLevel(ipInfo.abuse.abuseConfidenceScore)}
                                    </span>
                                </p>
                                <p>
                                    Toplam Rapor Sayısı: <strong>{ipInfo.abuse.totalReports || 0}</strong>
                                </p>
                                <p>
                                    Rapor Eden Kullanıcı Sayısı: <strong>{ipInfo.abuse.numDistinctUsers || 0}</strong>
                                </p>
                            </div>
                            
                            <div className="action-buttons">
                                <Button negative onClick={blockAddress} disabled={!ipAddress}>
                                    <Icon name="ban" />
                                    Bu IP Adresini Engelle
                                </Button>
                            </div>
                        </div>
                        
                        <div className="info-sections">
                            <Segment>
                                <Header as="h4">IP Adresi Detayları</Header>
                                <Table celled striped className="info-table">
                                    <Table.Body>
                                        <Table.Row>
                                            <Table.Cell width={4}>IP Adresi</Table.Cell>
                                            <Table.Cell>{ipInfo.abuse.ipAddress}</Table.Cell>
                                        </Table.Row>
                                        <Table.Row>
                                            <Table.Cell>IP Versiyonu</Table.Cell>
                                            <Table.Cell>{ipInfo.abuse.ipVersion === 4 ? 'IPv4' : 'IPv6'}</Table.Cell>
                                        </Table.Row>
                                        <Table.Row>
                                            <Table.Cell>İnternet Servis Sağlayıcısı</Table.Cell>
                                            <Table.Cell>{ipInfo.abuse.isp || 'Bilinmiyor'}</Table.Cell>
                                        </Table.Row>
                                        <Table.Row>
                                            <Table.Cell>Kullanım Tipi</Table.Cell>
                                            <Table.Cell>{ipInfo.abuse.usageType || 'Bilinmiyor'}</Table.Cell>
                                        </Table.Row>
                                        <Table.Row>
                                            <Table.Cell>Alan Adı</Table.Cell>
                                            <Table.Cell>{ipInfo.abuse.domain || 'Bilinmiyor'}</Table.Cell>
                                        </Table.Row>
                                        <Table.Row>
                                            <Table.Cell>Organizasyon</Table.Cell>
                                            <Table.Cell>{ipInfo.geo?.org || ipInfo.abuse.domain || 'Bilinmiyor'}</Table.Cell>
                                        </Table.Row>
                                        <Table.Row>
                                            <Table.Cell>Ülke</Table.Cell>
                                            <Table.Cell>
                                                {ipInfo.abuse.countryName || ipInfo.geo?.country || 'Bilinmiyor'} 
                                                {(ipInfo.abuse.countryCode || ipInfo.geo?.country) && 
                                                    ` (${ipInfo.abuse.countryCode || ipInfo.geo?.country})`
                                                }
                                            </Table.Cell>
                                        </Table.Row>
                                        <Table.Row>
                                            <Table.Cell>Raporlanmış mı?</Table.Cell>
                                            <Table.Cell>
                                                {ipInfo.abuse.totalReports > 0 ? (
                                                    <span className="negative-status">Evet - {ipInfo.abuse.totalReports} rapor</span>
                                                ) : (
                                                    <span className="positive-status">Hayır</span>
                                                )}
                                            </Table.Cell>
                                        </Table.Row>
                                    </Table.Body>
                                </Table>
                            </Segment>
                            
                            <Segment>
                                <Header as="h4">Güvenlik Bilgileri</Header>
                                <Table celled striped className="info-table">
                                    <Table.Body>
                                        <Table.Row>
                                            <Table.Cell width={4}>Son Rapor Tarihi</Table.Cell>
                                            <Table.Cell>{formatDate(ipInfo.abuse.lastReportedAt || 'Rapor yok')}</Table.Cell>
                                        </Table.Row>
                                        <Table.Row>
                                            <Table.Cell>Son 30 Gündeki Raporlar</Table.Cell>
                                            <Table.Cell>{ipInfo.abuse.reportedLast30Days || 0}</Table.Cell>
                                        </Table.Row>
                                        <Table.Row>
                                            <Table.Cell>Rapor Eden Kullanıcı Sayısı</Table.Cell>
                                            <Table.Cell>{ipInfo.abuse.numDistinctUsers || 0}</Table.Cell>
                                        </Table.Row>
                                        <Table.Row>
                                            <Table.Cell>Toplam Rapor Sayısı</Table.Cell>
                                            <Table.Cell>{ipInfo.abuse.totalReports || 0}</Table.Cell>
                                        </Table.Row>
                                    </Table.Body>
                                </Table>
                            </Segment>
                        </div>
                        
                        {ipInfo.abuse.totalReports > 0 && (
                            <Segment className="report-details">
                                <Header as="h4">Rapor Detayları</Header>
                                
                                <Header as="h5">Rapor Edilen Kategoriler</Header>
                                <div className="categories-container">
                                    {renderCategories(ipInfo.abuse.reports ? ipInfo.abuse.reports.flatMap(report => report.categories).filter((v, i, a) => a.indexOf(v) === i) : [])}
                                </div>
                                
                                {ipInfo.abuse.reports && ipInfo.abuse.reports.length > 0 && (
                                    <>
                                        <Header as="h5" className="recent-reports-title">Son Raporlar</Header>
                                        <div className="recent-reports">
                                            <Table celled className="reports-detail-table">
                                                <Table.Header>
                                                    <Table.Row>
                                                        <Table.HeaderCell>Tarih</Table.HeaderCell>
                                                        <Table.HeaderCell>Kategoriler</Table.HeaderCell>
                                                        <Table.HeaderCell>Yorum</Table.HeaderCell>
                                                    </Table.Row>
                                                </Table.Header>
                                                <Table.Body>
                                                    {ipInfo.abuse.reports.slice(0, 10).map((report, index) => (
                                                        <Table.Row key={index}>
                                                            <Table.Cell>{formatDate(report.reportedAt)}</Table.Cell>
                                                            <Table.Cell>{renderCategories(report.categories)}</Table.Cell>
                                                            <Table.Cell>{report.comment || '-'}</Table.Cell>
                                                        </Table.Row>
                                                    ))}
                                                </Table.Body>
                                            </Table>
                                            
                                            {ipInfo.abuse.reports.length > 10 && (
                                                <div className="more-reports-note">
                                                    <p>Toplamda {ipInfo.abuse.reports.length} rapor bulunmaktadır. Burada son 10 tanesi görüntülenmektedir.</p>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </Segment>
                        )}
                        
                        <div className="whois-info">
                            {ipInfo.abuse.whois && (
                                <Segment>
                                    <Header as="h4">WHOIS Bilgisi</Header>
                                    <pre className="whois-data">{ipInfo.abuse.whois}</pre>
                                </Segment>
                            )}
                        </div>
                        
                        <div className="data-sources">
                            <p className="data-attribution">
                                IP itibar verileri <a href="https://www.abuseipdb.com" target="_blank" rel="noopener noreferrer">AbuseIPDB</a> tarafından sağlanmaktadır.
                            </p>
                        </div>
                    </div>
                ) : !error && (
                    <div className="no-results">
                        <Message info>
                            <Message.Header>Bilgi</Message.Header>
                            <p>IP itibar bilgileri yüklenemedi.</p>
                        </Message>
                    </div>
                )}
            </Segment>
        </div>
    );
}

export default IPReputation;
