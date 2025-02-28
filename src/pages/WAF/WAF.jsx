import { useEffect, useState } from 'react';
import './WAF.css'
import 'semantic-ui-css/semantic.min.css'
import { getCookieJSON, removeCookie } from '../../utils/cookie';
import Menu from '../../components/Menu/Menu';
import { Table, Segment, Header, Grid, Statistic } from 'semantic-ui-react';
import { fetchLogs, fetchServerStats } from '../../utils/api';
import { Line } from 'react-chartjs-2';
import { GrStorage } from "react-icons/gr";
import i_ram from '../../assets/icons/i_ram.svg';
import i_cpu from '../../assets/icons/i_cpu.svg';
import i_storage from '../../assets/icons/i_storage.svg';
import i_profile from '../../assets/icons/i_profile.svg';
import i_logout from '../../assets/icons/i_logout.svg';

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
        <line x1="20" y1="9" x2="23"></line>
        <line x1="20" y1="14" x2="23"></line>
        <line x1="1" y1="9" x2="4"></line>
        <line x1="1" y1="14" x2="4"></line>
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
        <path d="M3 5v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2H5c1.1 0-2 .9-2 2zm4 5h10M7 14h10"></path>
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

    // Grafik ayarlarını güncelleyelim
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            y: {
                beginAtZero: true,
                suggestedMax: 100,
                title: {
                    display: false,
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
                    display: false,
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
                display: false,
            },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        return context.raw + '%';  
                    }
                }
            },
        },
        elements: {
            point: {
                radius: 2,
                hoverRadius: 5,
            },
            line: {
                tension: 0.3,
                fill: false, // Dolguyu kapatıyoruz
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

    // Kullanım oranına göre renk belirleme yardımcı fonksiyonu
    const getColorByUsage = (percentage) => {
        if (percentage >= 90) {
            return {
                border: 'rgba(220, 53, 69, 1)',      // Kırmızı
                background: 'rgba(220, 53, 69, 0.5)'
            };
        } else if (percentage >= 85) {
            return {
                border: 'rgba(255, 128, 0, 1)',      // Turuncu
                background: 'rgba(255, 128, 0, 0.5)'
            };
        } else if (percentage >= 70) {
            return {
                border: 'rgba(255, 193, 7, 1)',      // Sarı
                background: 'rgba(255, 193, 7, 0.5)'
            };
        } else {
            return {
                border: 'rgba(40, 167, 69, 1)',      // Yeşil
                background: 'rgba(40, 167, 69, 0.5)'
            };
        }
    };

    // Renk yaratan fonksiyon - önceki değerlere göre her nokta için ayrı renk
    const generateColors = (dataPoints) => {
        const borderColors = [];
        const backgroundColors = [];

        for (let i = 0; i < dataPoints.length; i++) {
            const value = parseFloat(dataPoints[i]);
            const colors = getColorByUsage(value);
            borderColors.push(colors.border);
            backgroundColors.push(colors.background);
        }

        return {
            borderColors,
            backgroundColors
        };
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

    // Grafik verilerini hazırla - sadece çizgi renklerini değerlere göre ayarla
    const prepareChartData = (dataType) => {
        if (!statsHistory || statsHistory.length === 0) return null;

        // Grafik için verileri ters çevir (en eski sol tarafta olsun)
        const reversedData = [...statsHistory].reverse();
        
        // Daha net zaman bilgisi için saat:dakika formatı
        const labels = reversedData.map(stat => {
            const date = new Date(stat.tarih);
            return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
        });

        // Değerler ve renkler için veri hazırlama
        let dataValues = [];
        let colorThresholds = [];

        if (dataType === 'ram') {
            dataValues = reversedData.map(stat => stat.RAMYuzdesi);
        } else if (dataType === 'cpu') {
            dataValues = reversedData.map(stat => stat.CPUYuzdesi);
        } else if (dataType === 'disk') {
            dataValues = reversedData.map(stat => stat.diskYuzdesi);
        }

        // Çizgi segmentleri için renk eşiklerini belirleme
        colorThresholds = dataValues.map(value => {
            if (value >= 90) return 'rgba(220, 53, 69, 1)';      // Kırmızı (≥90%)
            if (value >= 85) return 'rgba(255, 128, 0, 1)';      // Turuncu (≥85%)
            if (value >= 70) return 'rgba(255, 193, 7, 1)';      // Sarı (≥70%)
            return 'rgba(40, 167, 69, 1)';                       // Yeşil (<70%)
        });

        // Veri setini oluştur
        return {
            labels,
            datasets: [
                {
                    data: dataValues,
                    borderWidth: 2,
                    tension: 0.3,
                    fill: false,
                    segment: {
                        borderColor: ctx => colorThresholds[ctx.p0DataIndex],
                    },
                    pointBackgroundColor: (ctx) => {
                        const index = ctx.dataIndex;
                        return colorThresholds[index];
                    },
                    pointBorderColor: (ctx) => {
                        const index = ctx.dataIndex;
                        return colorThresholds[index];
                    },
                }
            ]
        };
    };

    // Kullanım oranına göre panelin üst kısmındaki yüzde değerinin rengini belirleme
    const getUsageColor = (percentage) => {
        if (percentage >= 90) return { color: 'var(--kirmizi-color, #dc3545)' };
        if (percentage >= 85) return { color: 'var(--turuncu-color, #ff8000)' };
        if (percentage >= 70) return { color: 'var(--sari-color, #ffc107)' };
        return { color: 'var(--yesil-color, #28a745)' };
    };

    return (
        <div id="background">
            <Menu />
            <div className="content">
                <Grid columns={3} stackable>
                    {/* RAM Grafiği */}
                    <Grid.Column className='card'>
                        <Segment className="stat-panel component">
                            <div className="stat-header">
                                <Header as='h3'>
                                    <img src={i_ram} className='icon' />
                                    {/* <ModernIcon name="ram" className="modern-icon" /> */}
                                    <Header.Content>RAM Kullanımı</Header.Content>
                                </Header>
                            </div>
                            <div className="stat-metrics">
                                <div className="metrics-container">
                                    <div className="usage-percentage">
                                        <Statistic>
                                            <Statistic.Value style={getUsageColor(latestStats.RAMYuzdesi)}>
                                                {formatPercentage(latestStats.RAMYuzdesi)}
                                            </Statistic.Value>
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
                                                }
                                            ]}
                                        />
                                    }
                                </div>
                            </div>
                        </Segment>
                    </Grid.Column>

                    {/* CPU Grafiği */}
                    <Grid.Column className='card'>
                        <Segment className="stat-panel component">
                            <div className="stat-header">
                                <Header as='h3'>
                                <img src={i_cpu} className='icon' />
                                    {/* <ModernIcon name="cpu" className="modern-icon" /> */}
                                    
                                    <Header.Content>CPU Kullanımı</Header.Content>
                                </Header>
                            </div>
                            <div className="stat-metrics">
                                <div className="metrics-container">
                                    <div className="usage-percentage">
                                        <Statistic>
                                            <Statistic.Value style={getUsageColor(latestStats.CPUYuzdesi)}>
                                                {formatPercentage(latestStats.CPUYuzdesi)}
                                            </Statistic.Value>
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
                                                }
                                            ]}
                                        />
                                    }
                                </div>
                            </div>
                        </Segment>
                    </Grid.Column>

                    {/* Disk Grafiği */}
                    <Grid.Column className='card'>
                        <Segment className="stat-panel component">
                            <div className="stat-header">
                                <Header as='h3'>
                                <img src={i_storage} className='icon' />
                                {/* <ModernIcon name="disk" className="modern-icon" /> */}
                                    <Header.Content>Disk Kullanımı</Header.Content>
                                </Header>
                            </div>
                            <div className="stat-metrics">
                                <div className="metrics-container">
                                    <div className="usage-percentage">
                                        <Statistic>
                                            <Statistic.Value style={getUsageColor(latestStats.diskYuzdesi)}>
                                                {formatPercentage(latestStats.diskYuzdesi)}
                                            </Statistic.Value>
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