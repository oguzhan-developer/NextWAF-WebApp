import { useEffect, useState } from 'react';
import './WAF.css'
import 'semantic-ui-css/semantic.min.css'
import { getCookieJSON, removeCookie } from '../../utils/cookie';
import Menu from '../../components/Menu/Menu';
import { Table, Segment, Header, Icon } from 'semantic-ui-react';
import { fetchLogs, fetchServerStats } from '../../utils/db';

function WAF() {
    const [username, setUsername] = useState('');
    const [logs, setLogs] = useState([]);
    const [serverStats, setServerStats] = useState({});

    useEffect(() => {
        const user = getCookieJSON("user");
        if (user === null) {
            alert("Sayfayı görüntülemek için giriş yapmalısınız.");
            window.location.href = "/login";
        } else {
            setUsername(user.username);
        }
    }, []);

    useEffect(() => {
        // Logları veritabanından çek
        fetchLogs()
            .then(logs => {
                setLogs(logs);
            })
            .catch(error => {
                console.error('Logları çekerken hata oluştu:', error);
            });

        // Sunucu istatistiklerini veritabanından çek
        fetchServerStats()
            .then(stats => {
                setServerStats(stats);
            })
            .catch(error => {
                console.error('Sunucu istatistiklerini çekerken hata oluştu:', error);
            });
    }, []);

    const formatTimestamp = (timestamp) => {
        const date = new Date(timestamp);
        return (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{date.toLocaleTimeString()}</span>
                <span>{date.toLocaleDateString()}</span>
            </div>
        );
    };

    return (
        <div id="background">
            <Menu />
            <div className="content">
                <Segment>
                    <Header as='h2'>
                        <Icon name='server' />
                        <Header.Content>Sunucu İstatistikleri</Header.Content>
                    </Header>
                    <p>RAM Kullanımı: {serverStats.ram}</p>
                    <p>CPU Kullanımı: {serverStats.cpu}</p>
                    <p>Depolama Alanı Kullanımı: {serverStats.storage}</p>
                </Segment>
                <Segment>
                    <Header as='h2'>
                        <Icon name='list' />
                        <Header.Content>Loglar</Header.Content>
                    </Header>
                    <Table celled>
                        <Table.Header>
                            <Table.Row>
                                <Table.HeaderCell>Kaynak IP</Table.HeaderCell>
                                <Table.HeaderCell>Hedef IP</Table.HeaderCell>
                                <Table.HeaderCell>Port</Table.HeaderCell>
                                <Table.HeaderCell>Dizin</Table.HeaderCell>
                                <Table.HeaderCell>Header</Table.HeaderCell>
                                <Table.HeaderCell>Zaman Damgası</Table.HeaderCell>
                            </Table.Row>
                        </Table.Header>
                        <Table.Body>
                            {logs.map((log, index) => (
                                <Table.Row key={index}>
                                    <Table.Cell>{log.source_ip}</Table.Cell>
                                    <Table.Cell>{log.destination_ip}</Table.Cell>
                                    <Table.Cell>{log.port}</Table.Cell>
                                    <Table.Cell>{log.directory}</Table.Cell>
                                    <Table.Cell>{log.header}</Table.Cell>
                                    <Table.Cell>{formatTimestamp(log.timestamp)}</Table.Cell>
                                </Table.Row>
                            ))}
                        </Table.Body>
                    </Table>
                </Segment>
            </div>
        </div>
    );
}

export default WAF;