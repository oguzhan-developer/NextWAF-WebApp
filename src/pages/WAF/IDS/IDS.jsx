import React, { useState, useEffect } from 'react';
import { Segment, Header, Table, Icon, Button, Divider, Statistic, Popup } from 'semantic-ui-react';
import { changeIDSLogStatus, fetchIDSLogs, removeIDSLog, sendTestIDSMail } from '../../../utils/api';
import './IDS.css';

function IDS() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sendingMail, setSendingMail] = useState(false);
    const [emailStatus, setEmailStatus] = useState(null);

    useEffect(() => {
        loadLogs();
    }, []);

    const loadLogs = async () => {
        setLoading(true);
        try {
            const logsData = await fetchIDSLogs();
            const sortedLogs = [...logsData].sort((a, b) => b.id - a.id);
            setLogs(sortedLogs);
        } catch (error) {
            console.error('Güvenlik logları yüklenirken hata oluştu:', error);
            setLogs([]);
        } finally {
            setLoading(false);
        }
    };

    const sendTestMail = async () => {
        setSendingMail(true);
        try {
            const result = await sendTestIDSMail();
            setEmailStatus(result);
            if (result.success) {
                alert("Test e-postası başarıyla gönderildi!");
            } else {
                alert(`Hata: ${result.message}`);
            }
        } catch (error) {
            alert("Mail gönderilirken hata oluştu: " + (error.message || "Bilinmeyen hata"));
            setEmailStatus({ success: false, message: error.message });
        } finally {
            setSendingMail(false);
        }
    };

    const formatDateTime = (timestamp) => {
        // Tarih nesnesini oluştur
        const date = new Date(timestamp);
        
        // Tarih yerel saat dilimine göre ayarlanıyor
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

    // HTTP koduna göre renk ayarlaması (css class)
    const getStatusColor = (status) => {
        if (status >= 500) return 'error-status';
        if (status >= 400) return 'warning-status';
        if (status >= 300) return 'redirect-status';
        if (status >= 200) return 'success-status';
        return '';
    };

    return (
        <div className="ids-page">
            <Segment className="component">
                <div className="log-header">
                    <Header as="h2">Güvenlik İhlal Logları</Header>
                    <div>
                        <Button
                            primary
                            onClick={loadLogs}
                            loading={loading}
                            style={{ marginRight: '10px' }}
                        >
                            <Icon name="refresh" />
                            Yenile
                        </Button>
                        <Button 
                            color="teal"
                            onClick={sendTestMail}
                            loading={sendingMail}
                        >
                            <Icon name="mail" />
                            Test E-postası Gönder
                        </Button>
                    </div>
                </div>
                <Divider />
                {emailStatus && !emailStatus.success && (
                    <div className="email-error-message">
                        <Icon name="warning" color="red" />
                        <span>E-posta yapılandırması hatalı. Lütfen .env dosyasındaki SMTP ayarlarını kontrol ediniz.</span>
                    </div>
                )}
                <p className="section-description">
                    Tespit edilen saldırılara ait kayıtlar.
                </p>

                <div className="table-container">
                    <Table celled className="striped security-table">
                        <Table.Header>
                            <Table.Row>
                                <Table.HeaderCell>ID</Table.HeaderCell>
                                <Table.HeaderCell>Tarih</Table.HeaderCell>
                                <Table.HeaderCell>IP Adresi</Table.HeaderCell>
                                <Table.HeaderCell>İstek URL</Table.HeaderCell>
                                <Table.HeaderCell>Saldırı Türü</Table.HeaderCell>
                                <Table.HeaderCell>Durum Kodu</Table.HeaderCell>
                                <Table.HeaderCell>Kullanıcı Tarayıcısı</Table.HeaderCell>
                                <Table.HeaderCell>Durum</Table.HeaderCell>
                            </Table.Row>
                        </Table.Header>

                        <Table.Body>
                            {loading ? (
                                <Table.Row>
                                    <Table.Cell colSpan="8" textAlign="center">
                                        <div className="loading-indicator">
                                            <Icon loading name="spinner" />
                                            Loglar yükleniyor...
                                        </div>
                                    </Table.Cell>
                                </Table.Row>
                            ) : logs.length === 0 ? (
                                <Table.Row>
                                    <Table.Cell colSpan="8" textAlign="center">
                                        <div className="empty-logs">
                                            <Icon name="check circle" size="large" />
                                            <p>Henüz güvenlik ihlali tespit edilmedi.</p>
                                        </div>
                                    </Table.Cell>
                                </Table.Row>
                            ) : (
                                logs.map((log) => (
                                    <Table.Row key={log.id}>
                                        <Table.Cell>{log.id}</Table.Cell>
                                        <Table.Cell>{formatDateTime(log.timestamp)}</Table.Cell>
                                        <Table.Cell>{log.ip_address}</Table.Cell>
                                        <Table.Cell className="uri-cell">
                                            <div className="truncate-text" title={log.request_uri}>
                                                {log.request_uri}
                                            </div>
                                        </Table.Cell>
                                        <Table.Cell>
                                            <Popup
                                                content={getAttackDescription(log.attack_type)}
                                                trigger={<span className="attack-type">{log.attack_type}</span>}
                                            />
                                        </Table.Cell>
                                        <Table.Cell textAlign="center" className={getStatusColor(log.status_code)}>
                                            {log.status_code}
                                        </Table.Cell>
                                        <Table.Cell className="user-agent-cell">
                                            <div className="truncate-text" title={log.user_agent}>
                                                {log.user_agent}
                                            </div>
                                        </Table.Cell>
                                        <Table.Cell className={log.checked ? "" : "negative"}>
                                            <div className='durum-div'>
                                                <span className={`status ${log.checked ? 'checked' : 'unchecked'}`}>
                                                    {log.checked ? "Kontrol edildi" : "Kontrol edilmedi"}
                                                </span>

                                                {
                                                    log.checked ?
                                                     (<Button size='small' className='btn basic red' onClick={() => removeIDSLog(log.id).then(loadLogs)}>Kaldır</Button>) : 
                                                     (<Button size='small' className='btn basic black'onClick={() => changeIDSLogStatus(log.id, log.checked).then(loadLogs)}>Tamamla</Button>)
                                                }

                                            </div>
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
                                <Statistic.Value>{logs.filter(l => !l.checked).length}</Statistic.Value>
                                <Statistic.Label>Kontrol edilmedi</Statistic.Label>
                            </Statistic>
                            <Statistic color='green'>
                                <Statistic.Value>{logs.filter(l => l.checked).length}</Statistic.Value>
                                <Statistic.Label>Tamamlandı</Statistic.Label>
                            </Statistic>
                        </Statistic.Group>
                    </div>
                )}
            </Segment>
        </div>
    );
}

function getAttackDescription(attackType) {
    const descriptions = {
        'SQL Injection': 'Veritabanındaki verileri çalmaya yönelik saldırı türü.',
        'XSS': 'Kullanıcı tarayıcısına zararlı script kodu çalıştırma girişimi.',
        'DDoS': 'Dağıtılmış Hizmet Engelleme Saldırısı. Sistemi aşırı istek göndererek çökertme girişimi.',
        'Brute Force': 'Kaba kuvvet saldırısı.',
        'File Inclusion': 'Yetkisi olmadığı sunucu dosyalarına erişme girişimi.',
    };

    return descriptions[attackType];
}

export default IDS;
