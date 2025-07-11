import React, { useState, useEffect } from 'react';
import { Segment, Header, Table, Icon, Button, Divider, Statistic, Popup, Modal } from 'semantic-ui-react';
import { changeIDSLogStatus, fetchIDSLogs, removeIDSLog, blockIP, blockAttackSource } from '../../../utils/api';
import { useNavigate } from 'react-router-dom';
import './IDS.css';

function IDS() {
    const navigate = useNavigate(); 
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [blockModalOpen, setBlockModalOpen] = useState(false);
    const [selectedIP, setSelectedIP] = useState(null);
    const [blockingIP, setBlockingIP] = useState(false);
    const [blockMessage, setBlockMessage] = useState({ type: '', content: '' });

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

    const handleIPClick = (ip) => {
        setSelectedIP(ip);
        setBlockModalOpen(true);
        setBlockMessage({ type: '', content: '' });
    };
    
    const handleReputationCheck = (ip) => {
        navigate(`/waf/ip-reputation?ip=${ip}`);
    };

    const handleBlockIP = async () => {
        if (!selectedIP) return;
        
        setBlockingIP(true);
        setBlockMessage({ type: '', content: '' });
        
        try {
            const response = await blockIP(selectedIP, 'Saldırı girişimi nedeniyle engellendi');
            
            if (response.success) {
                setBlockMessage({ 
                    type: 'success', 
                    content: `${selectedIP} adresi başarıyla engellendi.` 
                });
                loadLogs();
            } else {
                setBlockMessage({ 
                    type: 'error', 
                    content: response.message || 'IP adresi engellenirken bir hata oluştu.' 
                });
            }
        } catch (error) {
            console.error('IP adresi engellenirken hata:', error);
            setBlockMessage({ 
                type: 'error', 
                content: 'IP adresi engellenirken bir hata oluştu.' 
            });
        } finally {
            setBlockingIP(false);
        }
    };

    const handleBlockAttackSource = async (logId, ipAddress) => {
        setBlockingIP(true);
        setBlockMessage({ type: '', content: '' });
        
        try {
            const response = await blockAttackSource(logId);
            
            if (response.success) {
                setBlockMessage({ 
                    type: 'success', 
                    content: `${ipAddress} adresi başarıyla engellendi ve log işaretlendi.` 
                });
                loadLogs();
            } else {
                setBlockMessage({ 
                    type: 'error', 
                    content: response.message || 'Saldırı kaynağı engellenirken bir hata oluştu.' 
                });
            }
        } catch (error) {
            console.error('Saldırı kaynağı engellenirken hata:', error);
            setBlockMessage({ 
                type: 'error', 
                content: 'Saldırı kaynağı engellenirken bir hata oluştu.' 
            });
        } finally {
            setBlockingIP(false);
        }
    };

    const formatDateTime = (timestamp) => {
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
                        >
                            <Icon name="refresh" />
                            Yenile
                        </Button>
                    </div>
                </div>
                <Divider />
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
                                        <Table.Cell className="clickable-ip" onClick={() => handleIPClick(log.ip_address)}>
                                            <Popup
                                                content="IP adresini engellemek için tıklayın"
                                                trigger={
                                                    <span className="ip-link">
                                                        {log.ip_address}
                                                    </span>
                                                }
                                            />
                                        </Table.Cell>
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
                                                    {log.checked ? "Kontrol edildi" : "Beklemede"}
                                                </span>

                                                {
                                                    log.checked ?
                                                     (<Button size='small' className='btn basic red' onClick={() => removeIDSLog(log.id).then(loadLogs)}>Kaldır</Button>) : 
                                                     (<>
                                                        <Button size='small' className='btn basic black'onClick={() => changeIDSLogStatus(log.id, log.checked).then(loadLogs)}>Tamamla</Button>
                                                        <Button 
                                                            size='small' 
                                                            className='btn basic red' 
                                                            onClick={() => handleBlockAttackSource(log.id, log.ip_address)}
                                                            title="Saldırı kaynağını engelle ve logu işaretle"
                                                        >
                                                            <Icon name="ban" /> Engelle
                                                        </Button>
                                                    </>)
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
                
                {/* IP Engelleme Modal */}
                <Modal
                    open={blockModalOpen}
                    onClose={() => setBlockModalOpen(false)}
                    size="small"
                >
                    <Modal.Header>IP Adresi İşlemleri</Modal.Header>
                    <Modal.Content>
                        <p>
                            <strong>{selectedIP}</strong> IP adresi için yapmak istediğiniz işlemi seçiniz.
                        </p>
                        
                        {blockMessage.type && (
                            <div className={`message ${blockMessage.type}`}>
                                {blockMessage.type === 'success' ? (
                                    <Icon name="check circle" />
                                ) : (
                                    <Icon name="times circle" />
                                )}
                                {blockMessage.content}
                            </div>
                        )}
                    </Modal.Content>
                    <Modal.Actions>
                        <Button onClick={() => setBlockModalOpen(false)}>
                            İptal
                        </Button>
                        <Button 
                            color="blue" 
                            onClick={() => handleReputationCheck(selectedIP)}
                        >
                            <Icon name="search" />
                            IP İtibar Kontrolü
                        </Button>
                        <Button 
                            negative 
                            onClick={handleBlockIP}
                            loading={blockingIP}
                            disabled={blockMessage.type === 'success'}
                        >
                            <Icon name="ban" />
                            IP Adresini Engelle
                        </Button>
                    </Modal.Actions>
                </Modal>
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
