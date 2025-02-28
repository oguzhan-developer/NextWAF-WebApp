import { useEffect, useState } from 'react';
import './WAF.css'
import 'semantic-ui-css/semantic.min.css'
import { getCookieJSON, removeCookie } from '../../utils/cookie';
import Menu from '../../components/Menu/Menu';
import { Table, Segment, Header, Grid, Statistic } from 'semantic-ui-react';
import { fetchLogs, fetchServerStats } from '../../utils/api';
import { Line } from 'react-chartjs-2';
import { GrStorage } from "react-icons/gr";
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

// Modern SVG ikonları bileşeni
const ModernIcon = ({ name, ...props }) => {
  const icons = {
    ram: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <rect x="4" y="6" width="16" height="12" rx="2" ry="2"></rect>
        <path d="M6 10h.01M6 14h.01M10 10h.01M10 14h.01M14 10h.01M14 14h.01M18 10h.01M18 14h.01"></path>
      </svg>
    ),
    cpu: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect>
        <rect x="9" y="9" width="6" height="6"></rect>
        <line x1="9" y1="1" x2="9" y2="4"></line>
        <line x1="15" y1="1" x2="15" y2="4"></line>
        <line x1="9" y1="20" x2="9" y2="23"></line>
        <line x1="15" y1="20" x2="15" y2="23"></line>
        <line x1="20" y1="9" x2="23" y2="9"></line>
        <line x1="20" y1="14" x2="23" y2="14"></line>
        <line x1="1" y1="9" x2="4" y2="9"></line>
        <line x1="1" y1="14" x2="4" y2="14"></line>
      </svg>
    ),
    disk: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <circle cx="12" cy="12" r="10"></circle>
        <circle cx="12" cy="12" r="3"></circle>
      </svg>
    ),
    logs: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M3 5v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2zm4 5h10M7 14h10"></path>
      </svg>
    ),
  };

  return icons[name] || null;
};

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

    // Grafik ayarlarını güncelleyelim - etiketleri kaldırmak için düzenliyoruz
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            y: {
                beginAtZero: true,
                suggestedMax: 100,
                title: {
                    display: false, // Y ekseni başlığını kaldır
                },
                ticks: {
                    maxTicksLimit: 5,
                    callback: function(value) {
                        return value + '%';
                    }
                }
            },
            x: {
                title: {
                    display: false, // X ekseni başlığını kaldır
                },
                ticks: {
                    maxTicksLimit: 6,
                    maxRotation: 0,
                    minRotation: 0
                }
            }
        },
        plugins: {
            legend: {
                display: false, // Efsaneyi tamamen kaldır
            },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        return context.raw + '%';  
                    }
                }
            },
            filler: {
                propagate: true
            }
        },
        elements: {
            point: {
                radius: 2, // Daha küçük noktalar
                hoverRadius: 5,
            },
            line: {
                tension: 0.3,
                fill: true,
            }
        },
    };

    // Yüzde formatını düzenleyen yardımcı fonksiyon - .00 ile biten değerler için sadece tam sayı göster
    const formatPercentage = (value) => {
        if (value === undefined || value === null) return '0%';
        
        // String'e çevir
        const strValue = value.toString();
        
        // Eğer .00 ile bitiyorsa, sadece tam sayıyı al
        if (strValue.endsWith('.00')) {
            return parseInt(value, 10) + '%';
        }
        
        // Diğer durumlar için olduğu gibi bırak
        return value + '%';
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

            // Sunucu istatistiklerini yükle (son 10 kayıt) - daha az veri için 20'den 10'a düşürüldü
            const statsData = await fetchServerStats(10);
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

    // Grafik verilerini hazırla - dolgu sorununu çözmek için güncelledik
    const prepareChartData = (dataType) => {
        if (!statsHistory || statsHistory.length === 0) return null;

        // Grafik için verileri ters çevir (en eski sol tarafta olsun)
        const reversedData = [...statsHistory].reverse();
        
        // Daha net zaman bilgisi için saat:dakika formatı
        const labels = reversedData.map(stat => {
            const date = new Date(stat.tarih);
            return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
        });

        let data = {};
        
        // Tüm grafik tipleri için ortak ayarlar
        const commonDatasetProps = {
            borderWidth: 2,
            pointRadius: 1, 
            pointHoverRadius: 6,
            tension: 0.3,
            fill: true, // Dolgu aktif
        };

        if (dataType === 'ram') {
            data = {
                labels,
                datasets: [
                    {
                        ...commonDatasetProps,
                        data: reversedData.map(stat => stat.RAMYuzdesi),
                        borderColor: 'rgba(255, 99, 132, 1)',
                        backgroundColor: 'rgba(255, 99, 132, 0.5)',
                    }
                ]
            };
        } else if (dataType === 'cpu') {
            data = {
                labels,
                datasets: [
                    {
                        ...commonDatasetProps,
                        data: reversedData.map(stat => stat.CPUYuzdesi),
                        borderColor: 'rgba(255, 159, 64, 1)',
                        backgroundColor: 'rgba(255, 159, 64, 0.5)',
                    }
                ]
            };
        } else if (dataType === 'disk') {
            data = {
                labels,
                datasets: [
                    {
                        ...commonDatasetProps,
                        data: reversedData.map(stat => stat.diskYuzdesi),
                        borderColor: 'rgba(153, 102, 255, 1)',
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
                            <div className="stat-header">
                                <Header as='h3'>
                                    <ModernIcon name="ram" className="modern-icon" />
                                    <Header.Content>RAM Kullanımı</Header.Content>
                                </Header>
                            </div>
                            <div className="stat-metrics">
                                <div className="metrics-container">
                                    <div className="usage-percentage">
                                        <Statistic>
                                            <Statistic.Value>{formatPercentage(latestStats.RAMYuzdesi)}</Statistic.Value>
                                            <Statistic.Label>Kullanım</Statistic.Label>
                                        </Statistic>
                                    </div>
                                    <div className="usage-amount">
                                        <Statistic size="tiny" className="faded-stat">
                                            <Statistic.Value>{latestStats.usingRAM}/{latestStats.totalRAM}</Statistic.Value>
                                            <Statistic.Label>MB</Statistic.Label>
                                        </Statistic>
                                    </div>
                                </div>
                            </div>
                            <div className="chart-container">
                                <div className="chart-wrapper">
                                    {prepareChartData('ram') && 
                                        <Line 
                                            options={chartOptions} 
                                            data={prepareChartData('ram')} 
                                            plugins={[
                                                {
                                                    id: 'customCanvasBackgroundColor',
                                                    beforeDraw: (chart) => {
                                                        const ctx = chart.canvas.getContext('2d');
                                                        ctx.save();
                                                        ctx.globalCompositeOperation = 'destination-over';
                                                        ctx.fillStyle = 'white'; // Beyaz arka plan
                                                        ctx.fillRect(0, 0, chart.width, chart.height);
                                                        ctx.restore();
                                                    }
                                                },
                                                // Dolgu için özel plugin
                                                {
                                                    id: 'customFill',
                                                    beforeDatasetDraw: (chart) => {
                                                        const ctx = chart.canvas.getContext('2d');
                                                        ctx.save();
                                                        ctx.fillStyle = chart.data.datasets[0].backgroundColor;
                                                        
                                                        // Y ekseninin başlangıcından veri noktalarına kadar olan alanı doldur
                                                        const meta = chart.getDatasetMeta(0);
                                                        const yScale = chart.scales.y;
                                                        const xScale = chart.scales.x;
                                                        const bottom = yScale.getPixelForValue(0);
                                                        
                                                        ctx.beginPath();
                                                        ctx.moveTo(xScale.left, bottom);
                                                        
                                                        // İlk noktayı tanımla
                                                        if (meta.data.length > 0) {
                                                            ctx.lineTo(meta.data[0].x, meta.data[0].y);
                                                        }
                                                        
                                                        // Diğer noktaları tanımla
                                                        meta.data.forEach((point) => {
                                                            ctx.lineTo(point.x, point.y);
                                                        });
                                                        
                                                        // Son noktadan alta ve başlangıca
                                                        if (meta.data.length > 0) {
                                                            ctx.lineTo(meta.data[meta.data.length - 1].x, bottom);
                                                        }
                                                        ctx.lineTo(xScale.left, bottom);
                                                        
                                                        ctx.fill();
                                                        ctx.restore();
                                                    }
                                                }
                                            ]}
                                        />
                                    }
                                </div>
                            </div>
                        </Segment>
                    </Grid.Column>

                    {/* CPU Grafiği */}
                    <Grid.Column>
                        <Segment className="stat-panel">
                            <div className="stat-header">
                                <Header as='h3'>
                                    <ModernIcon name="cpu" className="modern-icon" />
                                    <Header.Content>CPU Kullanımı</Header.Content>
                                </Header>
                            </div>
                            <div className="stat-metrics">
                                <div className="metrics-container">
                                    <div className="usage-percentage">
                                        <Statistic>
                                            <Statistic.Value>{formatPercentage(latestStats.CPUYuzdesi)}</Statistic.Value>
                                            <Statistic.Label>Kullanım</Statistic.Label>
                                        </Statistic>
                                    </div>
                                    <div className="usage-amount">
                                        <Statistic size="tiny" className="faded-stat">
                                            <Statistic.Value>{latestStats.usingCPU}/{latestStats.totalCPU}</Statistic.Value>
                                            <Statistic.Label>CPU</Statistic.Label>
                                        </Statistic>
                                    </div>
                                </div>
                            </div>
                            <div className="chart-container">
                                <div className="chart-wrapper">
                                    {prepareChartData('cpu') && 
                                        <Line 
                                            options={chartOptions} 
                                            data={prepareChartData('cpu')}
                                            plugins={[
                                                {
                                                    id: 'customCanvasBackgroundColor',
                                                    beforeDraw: (chart) => {
                                                        const ctx = chart.canvas.getContext('2d');
                                                        ctx.save();
                                                        ctx.globalCompositeOperation = 'destination-over';
                                                        ctx.fillStyle = 'white';
                                                        ctx.fillRect(0, 0, chart.width, chart.height);
                                                        ctx.restore();
                                                    }
                                                },
                                                // Dolgu için aynı özel plugin
                                                {
                                                    id: 'customFillCPU',
                                                    beforeDatasetDraw: (chart) => {
                                                        const ctx = chart.canvas.getContext('2d');
                                                        ctx.save();
                                                        ctx.fillStyle = chart.data.datasets[0].backgroundColor;
                                                        
                                                        const meta = chart.getDatasetMeta(0);
                                                        const yScale = chart.scales.y;
                                                        const xScale = chart.scales.x;
                                                        const bottom = yScale.getPixelForValue(0);
                                                        
                                                        ctx.beginPath();
                                                        ctx.moveTo(xScale.left, bottom);
                                                        
                                                        if (meta.data.length > 0) {
                                                            ctx.lineTo(meta.data[0].x, meta.data[0].y);
                                                        }
                                                        
                                                        meta.data.forEach((point) => {
                                                            ctx.lineTo(point.x, point.y);
                                                        });
                                                        
                                                        if (meta.data.length > 0) {
                                                            ctx.lineTo(meta.data[meta.data.length - 1].x, bottom);
                                                        }
                                                        ctx.lineTo(xScale.left, bottom);
                                                        
                                                        ctx.fill();
                                                        ctx.restore();
                                                    }
                                                }
                                            ]}
                                        />
                                    }
                                </div>
                            </div>
                        </Segment>
                    </Grid.Column>

                    {/* Disk Grafiği */}
                    <Grid.Column>
                        <Segment className="stat-panel">
                            <div className="stat-header">
                                <Header as='h3'>
                                    <GrStorage className="modern-icon" />
                                    {/* <ModernIcon name="disk" className="modern-icon" /> */}
                                    <Header.Content>Disk Kullanımı</Header.Content>
                                </Header>
                            </div>
                            <div className="stat-metrics">
                                <div className="metrics-container">
                                    <div className="usage-percentage">
                                        <Statistic>
                                            <Statistic.Value>{formatPercentage(latestStats.diskYuzdesi)}</Statistic.Value>
                                            <Statistic.Label>Kullanım</Statistic.Label>
                                        </Statistic>
                                    </div>
                                    <div className="usage-amount">
                                        <Statistic size="tiny" className="faded-stat">
                                            <Statistic.Value>{latestStats.usingDisk}/{latestStats.totalDisk}</Statistic.Value>
                                            <Statistic.Label>GB</Statistic.Label>
                                        </Statistic>
                                    </div>
                                </div>
                            </div>
                            <div className="chart-container">
                                <div className="chart-wrapper">
                                    {prepareChartData('disk') && 
                                        <Line 
                                            options={chartOptions} 
                                            data={prepareChartData('disk')}
                                            plugins={[
                                                {
                                                    id: 'customCanvasBackgroundColor',
                                                    beforeDraw: (chart) => {
                                                        const ctx = chart.canvas.getContext('2d');
                                                        ctx.save();
                                                        ctx.globalCompositeOperation = 'destination-over';
                                                        ctx.fillStyle = 'white';
                                                        ctx.fillRect(0, 0, chart.width, chart.height);
                                                        ctx.restore();
                                                    }
                                                },
                                                // Dolgu için aynı özel plugin
                                                {
                                                    id: 'customFillDisk',
                                                    beforeDatasetDraw: (chart) => {
                                                        const ctx = chart.canvas.getContext('2d');
                                                        ctx.save();
                                                        ctx.fillStyle = chart.data.datasets[0].backgroundColor;
                                                        
                                                        const meta = chart.getDatasetMeta(0);
                                                        const yScale = chart.scales.y;
                                                        const xScale = chart.scales.x;
                                                        const bottom = yScale.getPixelForValue(0);
                                                        
                                                        ctx.beginPath();
                                                        ctx.moveTo(xScale.left, bottom);
                                                        
                                                        if (meta.data.length > 0) {
                                                            ctx.lineTo(meta.data[0].x, meta.data[0].y);
                                                        }
                                                        
                                                        meta.data.forEach((point) => {
                                                            ctx.lineTo(point.x, point.y);
                                                        });
                                                        
                                                        if (meta.data.length > 0) {
                                                            ctx.lineTo(meta.data[meta.data.length - 1].x, bottom);
                                                        }
                                                        ctx.lineTo(xScale.left, bottom);
                                                        
                                                        ctx.fill();
                                                        ctx.restore();
                                                    }
                                                }
                                            ]}
                                        />
                                    }
                                </div>
                            </div>
                        </Segment>
                    </Grid.Column>
                </Grid>

                {/* Loglar Tablosu */}
                <Segment>
                    <Header as='h2'>
                        <ModernIcon name="logs" className="modern-icon" />
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