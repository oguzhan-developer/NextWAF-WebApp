import { useEffect, useState } from 'react';
import './WAF.css'
import 'semantic-ui-css/semantic.min.css'
import { getCookieJSON, removeCookie } from '../../utils/cookie';
import Menu from '../../components/Menu/Menu';
import { Table, Segment, Header, Icon, Grid, Statistic } from 'semantic-ui-react';
import { fetchLogs, fetchServerStats } from '../../utils/api';
import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';

// Chart.js bileşenlerini kaydet
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
);

function WAF() {
    const [username, setUsername] = useState('');
    const [logs, setLogs] = useState([]);
    const [statsHistory, setStatsHistory] = useState([]);
    const [latestStats, setLatestStats] = useState({
        totalRAM: 0,
        usingRAM: 0,
        RAMYuzdesi: 0,
        totalCPU: 0,
        usingCPU: 0,
        CPUYuzdesi: 0,
        totalDisk: '0',
        usingDisk: '0',
        diskYuzdesi: 0,
    });

    // Grafik verilerinin renk ve stil ayarları
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            y: {
                beginAtZero: true,
                title: {
                    display: true,
                    text: 'Kullanım'
                }
            },
            x: {
                title: {
                    display: true,
                    text: 'Zaman'
                }
            }
        },
        plugins: {
            legend: {
                position: 'top',
            },
        },
    };

    useEffect(() => {
        const user = getCookieJSON("user");
        if (user === null) {
            alert("Sayfayı görüntülemek için giriş yapmalısınız.");
            window.location.href = "/login";
        } else {
            setUsername(user.username);
        }

        // Logları ve sunucu istatistiklerini yükle
        loadData();

        // Her 60 saniyede bir verileri güncelle
        const intervalId = setInterval(loadData, 60000);

        return () => clearInterval(intervalId);
    }, []);

    const loadData = async () => {
        try {
            // Logları yükle
            const logData = await fetchLogs();
            setLogs(logData);

            // Sunucu istatistiklerini yükle (son 10 kayıt)
            const statsData = await fetchServerStats(20);
            console.log("Statsdataa: ", statsData);
            
            setStatsHistory(statsData);

            // En son istatistiği ayarla
            if (statsData.length > 0) {
                setLatestStats(statsData[0]);
            }
        } catch (error) {
            console.error('Veri yüklenirken hata oluştu:', error);
        }
    };

    // Tarih formatlaması
    const formatTimestamp = (timestamp) => {
        const date = new Date(timestamp);
        return (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{date.toLocaleTimeString()}</span>
                <span>{date.toLocaleDateString()}</span>
            </div>
        );
    };

    // Grafik verilerini hazırla
    const prepareChartData = (dataType) => {
        if (!statsHistory || statsHistory.length === 0) return null;

        // Grafik için verileri ters çevir (en eski sol tarafta olsun)
        const reversedData = [...statsHistory].reverse();
        
        const labels = reversedData.map(stat => {
            const date = new Date(stat.tarih);
            return `${date.getHours()}:${date.getMinutes()}`;
        });

        let data = {};

        if (dataType === 'ram') {
            data = {
                labels,
                datasets: [
                    {
                        label: 'Kullanılan RAM (MB)',
                        data: reversedData.map(stat => stat.usingRAM),
                        borderColor: 'rgb(255, 99, 132)',
                        backgroundColor: 'rgba(255, 99, 132, 0.5)',
                    },
                    {
                        label: 'Toplam RAM (MB)',
                        data: reversedData.map(stat => stat.totalRAM),
                        borderColor: 'rgb(53, 162, 235)',
                        backgroundColor: 'rgba(53, 162, 235, 0.5)',
                    }
                ]
            };
        } else if (dataType === 'cpu') {
            data = {
                labels,
                datasets: [
                    {
                        label: 'Kullanılan CPU',
                        data: reversedData.map(stat => stat.usingCPU),
                        borderColor: 'rgb(255, 159, 64)',
                        backgroundColor: 'rgba(255, 159, 64, 0.5)',
                    },
                    {
                        label: 'Toplam CPU',
                        data: reversedData.map(stat => stat.totalCPU),
                        borderColor: 'rgb(75, 192, 192)',
                        backgroundColor: 'rgba(75, 192, 192, 0.5)',
                    }
                ]
            };
        } else if (dataType === 'disk') {
            data = {
                labels,
                datasets: [
                    {
                        label: 'Disk Kullanım %',
                        data: reversedData.map(stat => stat.diskYuzdesi),
                        borderColor: 'rgb(153, 102, 255)',
                        backgroundColor: 'rgba(153, 102, 255, 0.5)',
                    }
                ]
            };
        }

        return data;
    };

    return (
        <div id="background">
            <Menu />
            <div className="content">
                <Grid columns={3} stackable>
                    {/* RAM Grafiği */}
                    <Grid.Column>
                        <Segment className="stat-panel">
                            <Header as='h3'>
                                <Icon name='microchip' />
                                <Header.Content>RAM Kullanımı</Header.Content>
                            </Header>
                            <Statistic.Group size="small">
                                <Statistic>
                                    <Statistic.Value>{latestStats.RAMYuzdesi}%</Statistic.Value>
                                    <Statistic.Label>Kullanım</Statistic.Label>
                                </Statistic>
                                <Statistic>
                                    <Statistic.Value>{latestStats.usingRAM}/{latestStats.totalRAM}</Statistic.Value>
                                    <Statistic.Label>MB</Statistic.Label>
                                </Statistic>
                            </Statistic.Group>
                            <div className="chart-container">
                                {prepareChartData('ram') && 
                                    <Line options={chartOptions} data={prepareChartData('ram')} height={200} />
                                }
                            </div>
                        </Segment>
                    </Grid.Column>

                    {/* CPU Grafiği */}
                    <Grid.Column>
                        <Segment className="stat-panel">
                            <Header as='h3'>
                                <Icon name='server' />
                                <Header.Content>CPU Kullanımı</Header.Content>
                            </Header>
                            <Statistic.Group size="small">
                                <Statistic>
                                    <Statistic.Value>{latestStats.CPUYuzdesi}%</Statistic.Value>
                                    <Statistic.Label>Kullanım</Statistic.Label>
                                </Statistic>
                                <Statistic>
                                    <Statistic.Value>{latestStats.usingCPU}/{latestStats.totalCPU}</Statistic.Value>
                                    <Statistic.Label>CPU</Statistic.Label>
                                </Statistic>
                            </Statistic.Group>
                            <div className="chart-container">
                                {prepareChartData('cpu') && 
                                    <Line options={chartOptions} data={prepareChartData('cpu')} height={200} />
                                }
                            </div>
                        </Segment>
                    </Grid.Column>

                    {/* Disk Grafiği */}
                    <Grid.Column>
                        <Segment className="stat-panel">
                            <Header as='h3'>
                                <Icon name='hdd' />
                                <Header.Content>Disk Kullanımı</Header.Content>
                            </Header>
                            <Statistic.Group size="small">
                                <Statistic>
                                    <Statistic.Value>{latestStats.diskYuzdesi}%</Statistic.Value>
                                    <Statistic.Label>Kullanım</Statistic.Label>
                                </Statistic>
                                <Statistic>
                                    <Statistic.Value>{latestStats.usingDisk}/{latestStats.totalDisk}</Statistic.Value>
                                    <Statistic.Label>GB</Statistic.Label>
                                </Statistic>
                            </Statistic.Group>
                            <div className="chart-container">
                                {prepareChartData('disk') && 
                                    <Line options={chartOptions} data={prepareChartData('disk')} height={200} />
                                }
                            </div>
                        </Segment>
                    </Grid.Column>
                </Grid>

                {/* Loglar Tablosu */}
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