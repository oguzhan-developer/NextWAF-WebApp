import React, { useState, useEffect } from 'react';
import { Segment, Header, Table, Button, Icon, Input, Form, Message, Confirm, Pagination, Popup, Modal } from 'semantic-ui-react';
import { fetchBlockedIPs, blockIP, unblockIP } from '../../../utils/api';
import { useNavigate } from 'react-router-dom';
import './IPBlock.css';

function IPBlock() {
    const navigate = useNavigate();
    const [blockedIPs, setBlockedIPs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newIP, setNewIP] = useState('');
    const [blockReason, setBlockReason] = useState('');
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [selectedIP, setSelectedIP] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [modalOpen, setModalOpen] = useState(false);
    const [reputationModalOpen, setReputationModalOpen] = useState(false);
    const [reputationIP, setReputationIP] = useState('');
    const [reputationError, setReputationError] = useState('');

    const IPsPerPage = 10;

    useEffect(() => {
        loadBlockedIPs();
        
        const params = new URLSearchParams(location.search);
        const blockIp = params.get('block');
        
        if (blockIp) {
            setNewIP(blockIp);
            setBlockReason('Kötü itibar nedeniyle engellendi');
            setModalOpen(true);
            
            navigate('/waf/ipblock', { replace: true });
        }
    }, []);

    const loadBlockedIPs = async () => {
        setLoading(true);
        try {
            const ips = await fetchBlockedIPs();
            setBlockedIPs(ips);
            setTotalPages(Math.ceil(ips.length / IPsPerPage));
        } catch (error) {
            const message = 'IP listesi yüklenirken hata oluştu: ' + error.message;
            console.error(message);
            setErrorMessage(message);
        } finally {
            setLoading(false);
        }
    };

    const handleNewIPChange = (e) => {
        setNewIP(e.target.value);
    };

    const handleBlockReasonChange = (e) => {
        setBlockReason(e.target.value);
    };

    const validateIPAddress = (ip) => {
        const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
        
        if (!ipv4Regex.test(ip)) {
            return false;
        }
        
        const parts = ip.split('.');
        for (let i = 0; i < 4; i++) {
            const part = parseInt(parts[i], 10);
            if (part < 0 || part > 255) {
                return false;
            }
        }
        
        return true;
    };

    const handleAddIP = async () => {
        setErrorMessage('');
        setSuccessMessage('');
        
        if (!validateIPAddress(newIP)) {
            setErrorMessage('Geçerli bir IPv4 adresi girmelisiniz.');
            return;
        }
        
        if (blockedIPs.some(ip => ip.address === newIP)) {
            setErrorMessage('Bu IP adresi zaten engellenmiş durumda.');
            return;
        }
        
        setLoading(true);
        try {
            const response = await blockIP(newIP, blockReason || 'Manuel olarak engellendi');
            if (response.success) {
                loadBlockedIPs();
                setSuccessMessage(`${newIP} adresi başarıyla engellendi.`);
                setNewIP('');
                setBlockReason('');
                setModalOpen(false);
                
                // 3 saniye sonra başarı mesajını temizle
                setTimeout(() => {
                    setSuccessMessage('');
                }, 3000);
            } else {
                setErrorMessage('IP adresi engellenirken bir hata oluştu.');
            }
        } catch (error) {
            console.error('IP adresi engellenirken hata:', error);
            setErrorMessage('IP adresi engellenirken bir hata oluştu.');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteClick = (ip) => {
        setSelectedIP(ip);
        setConfirmOpen(true);
    };

    const handleConfirmDelete = async () => {
        setLoading(true);
        try {
            const response = await unblockIP(selectedIP);
            if (response.success) {
                loadBlockedIPs();
                setSuccessMessage(`${selectedIP} adresi için engelleme kaldırıldı.`);
                
                // 3 saniye sonra başarı mesajını temizle
                setTimeout(() => {
                    setSuccessMessage('');
                }, 3000);
            } else {
                setErrorMessage('IP adresi engellemesi kaldırılırken bir hata oluştu.');
            }
        } catch (error) {
            console.error('IP adresi engellemesi kaldırılırken hata:', error);
            setErrorMessage('IP adresi engellemesi kaldırılırken bir hata oluştu.');
        } finally {
            setConfirmOpen(false);
            setSelectedIP('');
            setLoading(false);
        }
    };

    const handlePageChange = (e, { activePage }) => {
        setPage(activePage);
    };

    const openBlockModal = () => {
        setNewIP('');
        setBlockReason('');
        setErrorMessage('');
        setModalOpen(true);
    };

    const openReputationModal = () => {
        setReputationIP('');
        setReputationError('');
        setReputationModalOpen(true);
    };

    const handleReputationIPChange = (e) => {
        setReputationIP(e.target.value);
    };

    const handleCheckReputation = () => {
        if (!validateIPAddress(reputationIP)) {
            setReputationError('Geçerli bir IPv4 adresi girmelisiniz.');
            return;
        }

        navigate(`/waf/ip-reputation?ip=${reputationIP}`);
    };

    const paginatedIPs = blockedIPs.slice((page - 1) * IPsPerPage, page * IPsPerPage);

    return (
        <div className="ipblock-page">
            <Segment className="component">
                {/* <Header as="h2">IP Adresi Engelleme</Header> */}
                
                {errorMessage && (
                    <Message negative onDismiss={() => setErrorMessage('')}>
                        <Message.Header>Hata</Message.Header>
                        <p>{errorMessage}</p>
                    </Message>
                )}
                
                {successMessage && (
                    <Message positive onDismiss={() => setSuccessMessage('')}>
                        <Message.Header>İşlem Başarılı</Message.Header>
                        <p>{successMessage}</p>
                    </Message>
                )}
                
                <div className="action-bar">
                    <Button 
                        color="blue"
                        onClick={openReputationModal}
                        className="reputation-btn"
                    >
                        <Icon name="search" />
                        IP İtibar Kontrolü
                    </Button>
                    <Button 
                        primary
                        onClick={openBlockModal}
                    >
                        <Icon name="ban" />
                        Manuel IP Engelle
                    </Button>
                </div>
                
                <Header as="h3" className="subheader">Engellenen IP Adresleri</Header>
                
                <div className="table-container">
                    <Table celled className="blocked-ips-table">
                        <Table.Header>
                            <Table.Row>
                                <Table.HeaderCell width={4}>IP Adresi</Table.HeaderCell>
                                <Table.HeaderCell width={3}>Engelleme Tarihi</Table.HeaderCell>
                                <Table.HeaderCell width={6}>Engelleme Nedeni</Table.HeaderCell>
                                <Table.HeaderCell width={3}>İşlem</Table.HeaderCell>
                            </Table.Row>
                        </Table.Header>

                        <Table.Body>
                            {loading ? (
                                <Table.Row>
                                    <Table.Cell colSpan="4" textAlign="center">
                                        <div className="loading-indicator">
                                            <Icon loading name="spinner" />
                                            Engellenen IP'ler yükleniyor...
                                        </div>
                                    </Table.Cell>
                                </Table.Row>
                            ) : paginatedIPs.length === 0 ? (
                                <Table.Row>
                                    <Table.Cell colSpan="4" textAlign="center">
                                        <div className="empty-list">
                                            <Icon name="shield" size="large" />
                                            <p>Henüz engellenen IP adresi bulunmuyor.</p>
                                        </div>
                                    </Table.Cell>
                                </Table.Row>
                            ) : (
                                paginatedIPs.map((ip, index) => (
                                    <Table.Row key={index}>
                                        <Table.Cell>
                                            <strong>{ip.address}</strong>
                                        </Table.Cell>
                                        <Table.Cell>
                                            {new Date(ip.blocked_date).toLocaleString('tr-TR')}
                                        </Table.Cell>
                                        <Table.Cell className="reason-cell">{ip.reason}</Table.Cell>
                                        <Table.Cell>
                                            <Button
                                                negative
                                                size="small"
                                                onClick={() => handleDeleteClick(ip.address)}
                                            >
                                                <Icon name="unlock" />
                                                Engellemeyi Kaldır
                                            </Button>
                                        </Table.Cell>
                                    </Table.Row>
                                ))
                            )}
                        </Table.Body>
                        
                        {blockedIPs.length > IPsPerPage && (
                            <Table.Footer>
                                <Table.Row>
                                    <Table.HeaderCell colSpan="4">
                                        <Pagination
                                            activePage={page}
                                            totalPages={totalPages}
                                            onPageChange={handlePageChange}
                                            ellipsisItem={{ content: <Icon name="ellipsis horizontal" />, icon: true }}
                                            firstItem={{ content: <Icon name="angle double left" />, icon: true }}
                                            lastItem={{ content: <Icon name="angle double right" />, icon: true }}
                                            prevItem={{ content: <Icon name="angle left" />, icon: true }}
                                            nextItem={{ content: <Icon name="angle right" />, icon: true }}
                                        />
                                    </Table.HeaderCell>
                                </Table.Row>
                            </Table.Footer>
                        )}
                    </Table>
                </div>
                
                <Modal
                    open={modalOpen}
                    onClose={() => setModalOpen(false)}
                    size="small"
                >
                    <Modal.Header>Manuel IP Adresi Engelleme</Modal.Header>
                    <Modal.Content>
                        <Form>
                            <Form.Field>
                                <label>IP Adresi</label>
                                <Input 
                                    placeholder="IP adresini girin (örn: 192.168.1.1)"
                                    value={newIP}
                                    onChange={handleNewIPChange}
                                    fluid
                                />
                            </Form.Field>
                            <Form.Field>
                                <label>Engelleme Nedeni</label>
                                <Input 
                                    placeholder="Engelleme nedenini belirtin"
                                    value={blockReason}
                                    onChange={handleBlockReasonChange}
                                    fluid
                                />
                            </Form.Field>
                            
                            {errorMessage && (
                                <Message negative>
                                    <p>{errorMessage}</p>
                                </Message>
                            )}
                        </Form>
                    </Modal.Content>
                    <Modal.Actions>
                        <Button onClick={() => setModalOpen(false)}>
                            İptal
                        </Button>
                        <Button 
                            primary 
                            onClick={handleAddIP}
                            loading={loading}
                            disabled={!newIP}
                        >
                            <Icon name="ban" />
                            IP Adresini Engelle
                        </Button>
                    </Modal.Actions>
                </Modal>
                
                <Modal
                    open={reputationModalOpen}
                    onClose={() => setReputationModalOpen(false)}
                    size="small"
                >
                    <Modal.Header>IP İtibar Kontrolü</Modal.Header>
                    <Modal.Content>
                        <p>
                            Kontrol etmek istediğiniz IP adresini girin.
                        </p>
                        <Form>
                            <Form.Field>
                                <label>IP Adresi</label>
                                <Input 
                                    placeholder="IP adresini girin (örn: 8.8.8.8)"
                                    value={reputationIP}
                                    onChange={handleReputationIPChange}
                                    fluid
                                />
                            </Form.Field>
                            
                            {reputationError && (
                                <Message negative>
                                    <p>{reputationError}</p>
                                </Message>
                            )}
                        </Form>
                    </Modal.Content>
                    <Modal.Actions>
                        <Button onClick={() => setReputationModalOpen(false)}>
                            İptal
                        </Button>
                        <Button 
                            color="blue" 
                            onClick={handleCheckReputation}
                            disabled={!reputationIP}
                        >
                            <Icon name="search" />
                            İtibarı Kontrol Et
                        </Button>
                    </Modal.Actions>
                </Modal>

                {/* Engel Kaldırma Onay Modal */}
                <Confirm
                    open={confirmOpen}
                    header="IP Engellemeyi Kaldır"
                    content={`${selectedIP} adresinin engellemesini kaldırmak istediğinize emin misiniz?`}
                    confirmButton="Evet, Engellemeyi Kaldır"
                    cancelButton="İptal"
                    onCancel={() => setConfirmOpen(false)}
                    onConfirm={handleConfirmDelete}
                />
            </Segment>
        </div>
    );
}

export default IPBlock;
