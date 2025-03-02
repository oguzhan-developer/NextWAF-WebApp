import React, { useState, useEffect } from 'react';
import { Table, Segment, Header, Grid, Statistic, Icon } from 'semantic-ui-react';
import { Line, Pie } from 'react-chartjs-2';
import { fetchIsApacheActive, fetchLogs, fetchOpenPorts, fetchServerIp, fetchServerStats } from '../../utils/api';
import './WAF.css';

function SystemHealth() {
    const [logs, setLogs] = useState([]);
    const [serverIp, setServerIp] = useState('0.0.0.0');
    const [isApacheActive, setIsApacheActive] = useState('Getiriliyor...');
    const [openPorts, setOpenPorts] = useState('Getiriliyor...');
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
    const [currentTime, setCurrentTime] = useState(new Date());

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            y: {
                beginAtZero: true,
                suggestedMax: 100,
                title: { display: false },
                grid: { color: 'rgba(200, 200, 200, 0.1)' },
                ticks: {
                    maxTicksLimit: 5,
                    callback: function (value) { return value + '%'; }
                }
            },
            x: {
                title: { display: false },
                grid: { display: false },
                ticks: {
                    maxTicksLimit: 6,
                    maxRotation: 0,
                    minRotation: 0
                }
            }
        },
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    label: function (context) { return context.raw + '%'; }
                }
            },
        },
        elements: {
            point: { radius: 2, hoverRadius: 5 },
            line: { tension: 0.3, fill: false }
        },
    };

    const pieOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    label: function (context) {
                        const label = context.label || '';
                        const value = context.formattedValue;
                        return `${label}: ${value}GB (${context.parsed}%)`;
                    }
                }
            }
        },
    };

    // WAF.jsx'ten alınan yardımcı fonksiyonlar
    const formatPercentage = (value) => {
        if (value === undefined || value === null) return '0%';
        const strValue = value.toString();
        if (strValue.endsWith('.00')) return parseInt(value, 10) + '%';
        return value + '%';
    };

    const getColorByUsage = (percentage) => {
        if (percentage >= 90) return { border: 'rgba(220, 53, 69, 1)', background: 'rgba(220, 53, 69, 0.5)' };
        if (percentage >= 85) return { border: 'rgba(255, 128, 0, 1)', background: 'rgba(255, 128, 0, 0.5)' };
        if (percentage >= 70) return { border: 'rgba(255, 193, 7, 1)', background: 'rgba(255, 193, 7, 0.5)' };
        return { border: 'rgba(40, 167, 69, 1)', background: 'rgba(40, 167, 69, 0.5)' };
    };

    const getDiskColors = (percentage) => {
        const freeC = "rgba(220, 220, 220, 0.8)";
        if (percentage >= 90) return ['rgba(220, 53, 69, 0.8)', freeC];
        if (percentage >= 85) return ['rgba(255, 128, 0, 0.8)', freeC];
        if (percentage >= 70) return ['rgba(255, 193, 7, 0.8)', freeC];
        return ['rgba(40, 167, 69, 0.8)', freeC];
    };

    const getDiskUsageColor = (percentage) => {
        if (percentage >= 90) return 'var(--kirmizi-color)';
        if (percentage >= 85) return 'var(--turuncu-color)';
        if (percentage >= 70) return 'var(--sari-color)';
        return 'var(--yesil-color)';
    };

    const getUsageColor = (percentage) => {
        if (percentage >= 90) return { color: 'var(--kirmizi-color, #dc3545)' };
        if (percentage >= 85) return { color: 'var(--turuncu-color, #ff8000)' };
        if (percentage >= 70) return { color: 'var(--sari-color, #ffc107)' };
        return { color: 'var(--yesil-color, #28a745)' };
    };

    const generateColors = (dataPoints) => {
        const borderColors = [];
        const backgroundColors = [];

        for (let i = 0; i < dataPoints.length; i++) {
            const value = parseFloat(dataPoints[i]);
            const colors = getColorByUsage(value);
            borderColors.push(colors.border);
            backgroundColors.push(colors.background);
        }

        return { borderColors, backgroundColors };
    };

    // Veri hazırlama fonksiyonları
    const prepareChartData = (dataType) => {
        if (!statsHistory || statsHistory.length === 0) return null;

        const reversedData = [...statsHistory].reverse();

        const labels = reversedData.map(stat => {
            const date = new Date(stat.tarih);
            return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
        });

        let dataValues = [];
        let colorThresholds = [];

        if (dataType === 'ram') {
            dataValues = reversedData.map(stat => stat.RAMYuzdesi);
        } else if (dataType === 'cpu') {
            dataValues = reversedData.map(stat => stat.CPUYuzdesi);
        } else if (dataType === 'disk') {
            dataValues = reversedData.map(stat => stat.diskYuzdesi);
        }

        colorThresholds = dataValues.map(value => {
            if (value >= 90) return 'rgba(220, 53, 69, 1)';
            if (value >= 85) return 'rgba(255, 128, 0, 1)';
            if (value >= 70) return 'rgba(255, 193, 7, 1)';
            return 'rgba(40, 167, 69, 1)';
        });

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
                    pointBackgroundColor: (ctx) => colorThresholds[ctx.dataIndex],
                    pointBorderColor: (ctx) => colorThresholds[ctx.dataIndex],
                }
            ]
        };
    };

    const preparePieData = () => {
        if (!latestStats) return null;

        const usedDisk = parseFloat(latestStats.usingDisk);
        const totalDisk = parseFloat(latestStats.totalDisk);
        const freeDisk = totalDisk - usedDisk;
        const usagePercentage = parseFloat(latestStats.diskYuzdesi);

        const [usedColor, freeColor] = getDiskColors(usagePercentage);

        return {
            labels: ['Kullanılan Alan', 'Boş Alan'],
            datasets: [
                {
                    data: [usedDisk, freeDisk],
                    backgroundColor: [usedColor, freeColor],
                    borderColor: ['rgba(255, 255, 255, 0.5)', 'rgba(255, 255, 255, 0.5)'],
                    borderWidth: 1,
                    hoverOffset: 4,
                }
            ]
        };
    };

    // Veri yükleme
    useEffect(() => {
        const loadData = async () => {
            try {
                const logData = await fetchLogs();
                setLogs(logData);

                const statsData = await fetchServerStats(7);
                setStatsHistory(statsData);

                if (statsData.length > 0) {
                    setLatestStats(statsData[0]);
                }

                setServerIp(await fetchServerIp());
                setOpenPorts(await fetchOpenPorts());
                setIsApacheActive(await fetchIsApacheActive());
            } catch (error) {
                console.error('Veri yüklenirken hata oluştu:', error);
            }
        };

        loadData();
        const intervalId = setInterval(loadData, 60000);

        return () => clearInterval(intervalId);
    }, []);

    // Sistem saati için yeni bir useEffect
    useEffect(() => {
        // Sayfa yüklendiğinde ve her saniye güncellenecek
        const timerID = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

        // Component unmount olduğunda timer'ı temizle
        return () => {
            clearInterval(timerID);
        };
    }, []);

    // Saati formatla
    const formatSystemTime = () => {
        return currentTime.toLocaleTimeString('tr-TR', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    // Tarihi formatla
    const formatSystemDate = () => {
        return currentTime.toLocaleDateString('tr-TR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    return (
        <>
            {/* RAM, CPU ve Disk grafikleri içeren üst Grid */}
            <Grid columns={3} stackable>
                {/* RAM Grafiği */}
                <Grid.Column className='card' style={{ width: '33.33%' }}>
                    <Segment className="stat-panel component">
                        <div className="stat-header">
                            <Header as='h3'>
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
                        <div className="chart-container transparent-bg">
                            <div className="chart-wrapper">
                                {prepareChartData('ram') &&
                                    <Line
                                        options={chartOptions}
                                        data={prepareChartData('ram')}
                                    />
                                }
                            </div>
                        </div>
                    </Segment>
                </Grid.Column>

                {/* CPU Grafiği */}
                <Grid.Column className='card' style={{ width: '33.33%' }}>
                    <Segment className="stat-panel component">
                        <div className="stat-header">
                            <Header as='h3'>
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
                        <div className="chart-container transparent-bg">
                            <div className="chart-wrapper">
                                {prepareChartData('cpu') &&
                                    <Line
                                        options={chartOptions}
                                        data={prepareChartData('cpu')}
                                    />
                                }
                            </div>
                        </div>
                    </Segment>
                </Grid.Column>

                {/* Disk Grafiği */}
                <Grid.Column className='card' style={{ width: '33.33%' }}>
                    <Segment className="stat-panel component">
                        <div className="stat-header">
                            <Header as='h3'>
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
                        <div className="custom-chart-legend">
                            <div className="legend-item">
                                <span
                                    className="legend-color"
                                    style={{
                                        backgroundColor: getDiskUsageColor(parseFloat(latestStats.diskYuzdesi))
                                    }}
                                ></span>
                                <span className="legend-label">Kullanılan Alan</span>
                            </div>
                            <div className="legend-item" >
                                <span className="legend-color free-color" style={{ borderWidth: "0.5rem" }}></span>
                                <span className="legend-label">Boş Alan</span>
                            </div>
                        </div>
                        <div className="chart-container transparent-bg pie-chart-container">
                            <div className="chart-wrapper">
                                {preparePieData() &&
                                    <Pie
                                        options={pieOptions}
                                        data={preparePieData()}
                                    />
                                }
                            </div>
                        </div>
                    </Segment>
                </Grid.Column>
            </Grid>

            {/* Alttaki kısma Sistem Bilgisi kartı gelecek */}
            <Segment className="component system-info-card">
                <Header as='h2'>
                    <Header.Content>Sistem Bilgisi</Header.Content>
                </Header>
                <div className="system-info-content">
                    <Grid columns={2}>
                        <Grid.Column>
                            <Table celled className="system-table">
                                <Table.Body>
                                    <Table.Row>
                                        <Table.Cell className="info-label">Sistem Saati</Table.Cell>
                                        <Table.Cell>{formatSystemTime()}</Table.Cell>
                                    </Table.Row>
                                    <Table.Row>
                                        <Table.Cell className="info-label">Web Sunucu Servisi (Apache)</Table.Cell>
                                        <Table.Cell><span style={{ color: isApacheActive == "Aktif" ? "green" : "red" }}>{isApacheActive}</span></Table.Cell>
                                    </Table.Row>
                                    <Table.Row>
                                        <Table.Cell className="info-label">Sistem İletişim Servisi (Nginx)</Table.Cell>
                                        <Table.Cell><span style={{ color: "green" }}>Aktif</span></Table.Cell>
                                    </Table.Row>
                                </Table.Body>
                            </Table>
                        </Grid.Column>
                        <Grid.Column>
                            <Table celled className="system-table">
                                <Table.Body>
                                    <Table.Row>
                                        <Table.Cell className="info-label">Sunucu IP Adresi</Table.Cell>
                                        <Table.Cell>{serverIp? serverIp: "0.0.0.0"}</Table.Cell>
                                    </Table.Row>
                                    <Table.Row>
                                        <Table.Cell className="info-label">Aktif Portlar</Table.Cell>
                                        <Table.Cell>{openPorts}</Table.Cell>
                                    </Table.Row>

                                </Table.Body>
                            </Table>
                        </Grid.Column>
                    </Grid>
                </div>
            </Segment>
        </>
    );
}

export default SystemHealth;
