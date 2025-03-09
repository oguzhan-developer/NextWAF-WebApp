import React, { useState, useEffect } from 'react';
import { Segment, Header, Grid, Table, Icon, Button, Card, Divider, Statistic, Popup } from 'semantic-ui-react';
import { fetchIDSServices, fetchSecurityLogs } from '../../../utils/api';
import './IDS.css';

function IDS() {
    const [services, setServices] = useState({
        ddos: { active: false, loading: true },
        xss: { active: false, loading: true },
        sqlinjection: { active: false, loading: true }
    });
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadLogs();
    }, []);

    const loadLogs = async () => {
        setLoading(true);
        try {
            const logsData = await fetchSecurityLogs();
            setLogs(logsData);
        } catch (error) {
            console.error('Güvenlik logları yüklenirken hata oluştu:', error);
            setLogs([]);
        } finally {
            setLoading(false);
        }
    };

    const toggleService = async (service) => {
        const updatedServices = { ...services };
        updatedServices[service].loading = true;
        setServices(updatedServices);

        try {
            // Burada gerçek toggle API çağrısı olacak
            const newStatus = !services[service].active;
            // await toggleIDSService(service, newStatus);
            
            // Başarılı olunca state'i güncelle
            updatedServices[service].active = newStatus;
            updatedServices[service].loading = false;
            setServices(updatedServices);
        } catch (error) {
            console.error(`${service} servisi güncellenirken hata oluştu:`, error);
            updatedServices[service].loading = false;
            setServices(updatedServices);
        }
    };

    const formatDateTime = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleString('tr-TR');
    };

    return (
        <div className="ids-page">
            <Segment className="component">
                <div className="log-header">
                    <Header as="h2">Güvenlik İhlal Logları</Header>
                    <Button 
                        icon 
                        // labelPosition='left' 
                        primary 
                        onClick={loadLogs}
                        loading={loading}
                        className='refresh-button'
                    >
                        <span className='text'>Yenile</span>
                        <Icon name='refresh' className='icon'/>
                    </Button>
                </div>
                <Divider />
                <p className="section-description">
                    Tespit edilen saldırılara ait kayıtlar.
                </p>
                
                <div className="table-container">
                    <Table celled className="security-table">
                        <Table.Header>
                            <Table.Row>
                                <Table.HeaderCell>Tarih</Table.HeaderCell>
                                <Table.HeaderCell>IP Adresi</Table.HeaderCell>
                                <Table.HeaderCell>Saldırı Türü</Table.HeaderCell>
                                <Table.HeaderCell>Hedef URL</Table.HeaderCell>
                                <Table.HeaderCell>Tehdit Seviyesi</Table.HeaderCell>
                                <Table.HeaderCell>Durum</Table.HeaderCell>
                            </Table.Row>
                        </Table.Header>
                        
                        <Table.Body>
                            {loading ? (
                                <Table.Row>
                                    <Table.Cell colSpan="6" textAlign="center">
                                        <div className="loading-indicator">
                                            <Icon loading name="spinner" />
                                            Loglar yükleniyor...
                                        </div>
                                    </Table.Cell>
                                </Table.Row>
                            ) : logs.length === 0 ? (
                                <Table.Row>
                                    <Table.Cell colSpan="6" textAlign="center">
                                        <div className="empty-logs">
                                            <Icon name="check circle" size="large" />
                                            <p>Henüz güvenlik ihlali tespit edilmedi.</p>
                                        </div>
                                    </Table.Cell>
                                </Table.Row>
                            ) : (
                                logs.map((log, index) => (
                                    <Table.Row key={index} className={getThreatRowClass(log.severity)}>
                                        <Table.Cell>{formatDateTime(log.timestamp)}</Table.Cell>
                                        <Table.Cell>{log.ip_address}</Table.Cell>
                                        <Table.Cell>
                                            <Popup
                                                content={getAttackDescription(log.attack_type)}
                                                trigger={<span className="attack-type">{log.attack_type}</span>}
                                            />
                                        </Table.Cell>
                                        <Table.Cell className="target-url">
                                            <div className="truncate-text" title={log.target_url}>
                                                {log.target_url}
                                            </div>
                                        </Table.Cell>
                                        <Table.Cell>
                                            {renderThreatLevel(log.severity)}
                                        </Table.Cell>
                                        <Table.Cell>
                                            <span className={`status ${log.action === 'blocked' ? 'blocked' : 'allowed'}`}>
                                                {log.action === 'blocked' ? 'Engellendi' : 'İzleniyor'}
                                            </span>
                                        </Table.Cell>
                                    </Table.Row>
                                ))
                            )}
                        </Table.Body>
                    </Table>
                </div>
                
                {logs.length > 0 && (
                    <div className="summary-stats">
                        <Statistic.Group size='small'>
                            <Statistic color='red'>
                                <Statistic.Value>{logs.filter(l => l.severity === 'high').length}</Statistic.Value>
                                <Statistic.Label>Yüksek Risk</Statistic.Label>
                            </Statistic>
                            <Statistic color='yellow'>
                                <Statistic.Value>{logs.filter(l => l.severity === 'medium').length}</Statistic.Value>
                                <Statistic.Label>Orta Risk</Statistic.Label>
                            </Statistic>
                            <Statistic color='blue'>
                                <Statistic.Value>{logs.filter(l => l.severity === 'low').length}</Statistic.Value>
                                <Statistic.Label>Düşük Risk</Statistic.Label>
                            </Statistic>
                            <Statistic color='green'>
                                <Statistic.Value>{logs.filter(l => l.action === 'blocked').length}</Statistic.Value>
                                <Statistic.Label>Engellendi</Statistic.Label>
                            </Statistic>
                        </Statistic.Group>
                    </div>
                )}
            </Segment>
        </div>
    );
}

// Yardımcı fonksiyonlar
function getThreatRowClass(severity) {
    switch(severity) {
        case 'high': return 'high-threat';
        case 'medium': return 'medium-threat';
        case 'low': return 'low-threat';
        default: return '';
    }
}

function renderThreatLevel(severity) {
    const levels = {
        high: { icon: 'exclamation triangle', color: 'red', text: 'Yüksek' },
        medium: { icon: 'warning sign', color: 'yellow', text: 'Orta' },
        low: { icon: 'info circle', color: 'blue', text: 'Düşük' }
    };
    
    const level = levels[severity] || levels.low;
    
    return (
        <div className={`threat-level ${severity}`}>
            <Icon name={level.icon} color={level.color} />
            <span>{level.text}</span>
        </div>
    );
}

function getAttackDescription(attackType) {
    const descriptions = {
        'SQL Injection': 'Veritabanı sorgularına zararlı kod enjekte etme girişimi.',
        'XSS': 'Cross-site scripting saldırısı. Kullanıcı tarayıcısına zararlı script kodu enjekte etme girişimi.',
        'DDoS': 'Dağıtılmış Hizmet Engelleme Saldırısı. Sistemi aşırı istek göndererek çökertme girişimi.',
        'Brute Force': 'Kullanıcı hesaplarına şifre deneme ile erişme girişimi.',
        'File Inclusion': 'Uzak veya yerel dosya erişimi/ekleme girişimi.',
        'Command Injection': 'İşletim sistemi komutlarını uzaktan çalıştırma girişimi.',
    };
    
    return descriptions[attackType] || 'Belirlenmemiş saldırı türü.';
}

export default IDS;
