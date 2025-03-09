import React, { useState, useEffect } from 'react';
import { Segment, Header, Table, Pagination, Input, Dropdown, Icon, Divider, Button } from 'semantic-ui-react';
import { fetchLogs } from '../../../utils/api.jsx';
import './Loglar.css';
import i_search from "../../../assets/icons/i_search.svg";

function Loglar() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activePage, setActivePage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [search, setSearch] = useState('');
    const [sortField, setSortField] = useState('timestamp');
    const [sortDirection, setSortDirection] = useState('desc');
    const [itemsPerPage, setItemsPerPage] = useState(10);

    useEffect(() => {
        loadLogs();        
    }, [activePage, search, sortField, sortDirection, itemsPerPage]);

    const loadLogs = async () => {
        setLoading(true);
        try {
            const response = await fetchLogs({
                page: activePage,
                limit: itemsPerPage,
                search: search,
                sortField: sortField,
                sortDirection: sortDirection
            });
            
            setLogs(response.data || []);
            
            const pages = parseInt(response.totalPages || 1);
            console.log("Toplam sayfa sayısı:", pages);
            
            setTotalPages(pages > 0 ? pages : 1);
        } catch (error) {
            console.error('Log verileri yüklenirken hata oluştu:', error);
            setLogs([]);
            setTotalPages(1);
        } finally {
            setLoading(false);
        }
    };

    const handlePageChange = (e, { activePage }) => {
        setActivePage(activePage);
    };

    const handleSearchChange = (e, { value }) => {
        setSearch(value);
        setActivePage(1); 
    };

    const handleSort = (clickedColumn) => {
        if (sortField === clickedColumn) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(clickedColumn);
            setSortDirection('asc');
        }
        setActivePage(1);
    };

    // Dropdown değişikliği için handler fonksiyonu
    const handleItemsPerPageChange = (e, data) => {
        console.log("Dropdown değişti:", data.value); // Debug için
        setItemsPerPage(data.value);
        setActivePage(1);
    };

    const formatDateTime = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleString('tr-TR');
    };

    const getStatusColor = (status) => {
        if (status >= 500) return 'error-status'; 
        if (status >= 400) return 'warning-status';
        if (status >= 300) return 'redirect-status';
        if (status >= 200) return 'success-status';
        return '';
    };

    const itemsPerPageOptions = [
        { key: 10, text: '10 Kayıt', value: 10 },
        { key: 25, text: '25 Kayıt', value: 25 },
        { key: 50, text: '50 Kayıt', value: 50 },
        { key: 100, text: '100 Kayıt', value: 100 }
    ];

    return (
        <div className="loglar-page">            
            <Segment className="component">
                <div className="table-controls">
                    <div className="left-controls">
                        <input 
                            placeholder='Ara...' 
                            onChange={(e) => handleSearchChange(e, {value: e.target.value})}
                            className='search-input'
                            value={search}
                        />
                        <Button className='search-button'>
                            <img src={i_search} className='search-icon' />
                        </Button>
                        <Dropdown
                            selection
                            options={itemsPerPageOptions}
                            value={itemsPerPage}
                            onChange={handleItemsPerPageChange}
                            className="items-per-page-dropdown"
                        />
                    </div>
                    <div className="right-controls">
                        <button className="ui button primary" onClick={loadLogs}>
                            <Icon name="refresh" />
                            Yenile
                        </button>
                    </div>
                </div>
                
                <Divider />

                <div className="table-container">
                    <Table sortable celled className="logs-table" striped>
                        <Table.Header>
                            <Table.Row>
                                <Table.HeaderCell 
                                    sorted={sortField === 'id' ? sortDirection : null}
                                    onClick={() => handleSort('id')}
                                    width={1}
                                >
                                    ID
                                </Table.HeaderCell>
                                <Table.HeaderCell 
                                    sorted={sortField === 'ip_address' ? sortDirection : null}
                                    onClick={() => handleSort('ip_address')}
                                    width={2}
                                >
                                    IP Adresi
                                </Table.HeaderCell>
                                <Table.HeaderCell 
                                    sorted={sortField === 'request_method' ? sortDirection : null}
                                    onClick={() => handleSort('request_method')}
                                    width={1}
                                >
                                    Method
                                </Table.HeaderCell>
                                <Table.HeaderCell 
                                    sorted={sortField === 'request_uri' ? sortDirection : null}
                                    onClick={() => handleSort('request_uri')}
                                    width={4}
                                >
                                    İstek URI
                                </Table.HeaderCell>
                                <Table.HeaderCell 
                                    sorted={sortField === 'status_code' ? sortDirection : null}
                                    onClick={() => handleSort('status_code')}
                                    width={1}
                                    textAlign="center"
                                >
                                    Durum
                                </Table.HeaderCell>
                                <Table.HeaderCell 
                                    sorted={sortField === 'size' ? sortDirection : null}
                                    onClick={() => handleSort('size')}
                                    width={1}
                                >
                                    Boyut
                                </Table.HeaderCell>
                                <Table.HeaderCell 
                                    sorted={sortField === 'timestamp' ? sortDirection : null}
                                    onClick={() => handleSort('timestamp')}
                                    width={2}
                                >
                                    Tarih
                                </Table.HeaderCell>
                                <Table.HeaderCell 
                                    sorted={sortField === 'user_agent' ? sortDirection : null}
                                    onClick={() => handleSort('user_agent')}
                                    width={4}
                                >
                                    Kullanıcı Tarayıcısı
                                </Table.HeaderCell>
                            </Table.Row>
                        </Table.Header>

                        <Table.Body>
                            {loading ? (
                                <Table.Row>
                                    <Table.Cell colSpan="8" textAlign="center">
                                        <div className="loading-indicator">
                                            <Icon loading name="spinner" />
                                            Veriler yükleniyor...
                                        </div>
                                    </Table.Cell>
                                </Table.Row>
                            ) : logs.length === 0 ? (
                                <Table.Row>
                                    <Table.Cell colSpan="8" textAlign="center">
                                        Kayıt bulunamadı
                                    </Table.Cell>
                                </Table.Row>
                            ) : (
                                logs.map(log => (
                                    <Table.Row key={log.id}>
                                        <Table.Cell>{log.id}</Table.Cell>
                                        <Table.Cell>{log.ip_address}</Table.Cell>
                                        <Table.Cell className={`method-${log.request_method.toLowerCase()}`}>
                                            {log.request_method}
                                        </Table.Cell>
                                        <Table.Cell className="uri-cell">
                                            <div className="truncate-text" title={log.request_uri}>
                                                {log.request_uri}
                                            </div>
                                        </Table.Cell>
                                        <Table.Cell textAlign="center" className={getStatusColor(log.status_code)}>
                                            {log.status_code}
                                        </Table.Cell>
                                        <Table.Cell>{formatSize(log.size)}</Table.Cell>
                                        <Table.Cell>{formatDateTime(log.timestamp)}</Table.Cell>
                                        <Table.Cell className="user-agent-cell">
                                            <div className="truncate-text" title={log.user_agent}>
                                                {log.user_agent}
                                            </div>
                                        </Table.Cell>
                                    </Table.Row>
                                ))
                            )}
                        </Table.Body>
                        
                        <Table.Footer>
                            <Table.Row>
                                <Table.HeaderCell colSpan="8">
                                    <div className="pagination-container">
                                        <div className="pagination-info" style={{ marginBottom: '10px' }}>
                                            Toplam <strong>{totalPages}</strong> sayfa | Şu anki sayfa: <strong>{activePage}</strong>
                                        </div>
                                        
                                        <Pagination 
                                            className="pagination-control"
                                            activePage={activePage}
                                            onPageChange={handlePageChange}
                                            totalPages={totalPages}
                                            boundaryRange={1}
                                            siblingRange={1}
                                            ellipsisItem={{ 
                                                content: <Icon name='ellipsis horizontal' />, 
                                                icon: true,
                                                disabled: totalPages <= 3
                                            }}
                                            firstItem={{ 
                                                content: <Icon name='angle double left' />, 
                                                icon: true,
                                                disabled: totalPages <= 1 || activePage === 1
                                            }}
                                            lastItem={{ 
                                                content: <Icon name='angle double right' />, 
                                                icon: true,
                                                disabled: totalPages <= 1 || activePage === totalPages
                                            }}
                                            prevItem={{ 
                                                content: <Icon name='angle left' />, 
                                                icon: true,
                                                disabled: totalPages <= 1 || activePage === 1
                                            }}
                                            nextItem={{ 
                                                content: <Icon name='angle right' />, 
                                                icon: true,
                                                disabled: totalPages <= 1 || activePage === totalPages
                                            }}
                                        />
                                    </div>
                                </Table.HeaderCell>
                            </Table.Row>
                        </Table.Footer>
                    </Table>
                </div>
            </Segment>
        </div>
    );
}

function formatSize(bytes) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default Loglar;
