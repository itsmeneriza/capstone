/**
 * Forecast Component
 * AI-powered analytics and predictions with year-over-year comparison
 */

import { dataService } from '../services/dataService.js';

export class Forecast {
    constructor() {
        this.container = document.getElementById('forecast-container');
        this.lastYearData = null;
    }

    async loadLastYearData() {
        try {
            const response = await fetch('/data/lastyeardata.json');
            if (response.ok) {
                this.lastYearData = await response.json();
            }
        } catch (e) {
            console.error("Failed to load last year data", e);
        }
    }

    calculateLastYearStats() {
        if (!this.lastYearData || this.lastYearData.length === 0) {
            return null;
        }

        const stats = {
            totalreservations: this.lastYearData.length,
            byRoom: {},
            byMonth: {},
            byDayOfWeek: {},
            totalAttendees: 0,
            averageAttendees: 0
        };

        // Calculate stats by room, month, and day of week
        this.lastYearData.forEach(reservation => {
            // By room
            if (!stats.byRoom[reservation.roomId]) {
                stats.byRoom[reservation.roomId] = {
                    count: 0,
                    attendees: 0
                };
            }
            stats.byRoom[reservation.roomId].count++;
            stats.byRoom[reservation.roomId].attendees += reservation.attendees || 0;

            // By month
            const month = new Date(reservation.date).toLocaleString('default', { month: 'long' });
            if (!stats.byMonth[month]) {
                stats.byMonth[month] = 0;
            }
            stats.byMonth[month]++;

            // By day of week
            const dayOfWeek = new Date(reservation.date).toLocaleString('default', { weekday: 'long' });
            if (!stats.byDayOfWeek[dayOfWeek]) {
                stats.byDayOfWeek[dayOfWeek] = 0;
            }
            stats.byDayOfWeek[dayOfWeek]++;

            stats.totalAttendees += reservation.attendees || 0;
        });

        stats.averageAttendees = Math.round(stats.totalAttendees / stats.totalreservations);

        // Find most popular room
        let maxCount = 0;
        let mostPopular = '';
        Object.keys(stats.byRoom).forEach(roomId => {
            if (stats.byRoom[roomId].count > maxCount) {
                maxCount = stats.byRoom[roomId].count;
                mostPopular = roomId;
            }
        });
        stats.mostPopularRoom = mostPopular;

        // Find busiest month
        let maxMonthCount = 0;
        let busiestMonth = '';
        Object.keys(stats.byMonth).forEach(month => {
            if (stats.byMonth[month] > maxMonthCount) {
                maxMonthCount = stats.byMonth[month];
                busiestMonth = month;
            }
        });
        stats.busiestMonth = busiestMonth;
        stats.busiestMonthCount = maxMonthCount;

        // Find busiest day of week
        let maxDayCount = 0;
        let busiestDay = '';
        Object.keys(stats.byDayOfWeek).forEach(day => {
            if (stats.byDayOfWeek[day] > maxDayCount) {
                maxDayCount = stats.byDayOfWeek[day];
                busiestDay = day;
            }
        });
        stats.busiestDayOfWeek = busiestDay;
        stats.busiestDayCount = maxDayCount;

        return stats;
    }

    calculateComparison(currentStats, lastYearStats) {
        if (!lastYearStats) return null;

        const comparison = {
            totalChange: currentStats.totalreservations - lastYearStats.totalreservations,
            totalChangePercent: lastYearStats.totalreservations > 0 
                ? Math.round(((currentStats.totalreservations - lastYearStats.totalreservations) / lastYearStats.totalreservations) * 100)
                : 0,
            attendeesChange: currentStats.averageAttendees - lastYearStats.averageAttendees,
            attendeesChangePercent: lastYearStats.averageAttendees > 0
                ? Math.round(((currentStats.averageAttendees - lastYearStats.averageAttendees) / lastYearStats.averageAttendees) * 100)
                : 0,
            roomComparisons: {}
        };

        // Compare by room
        Object.keys(currentStats.roomAnalytics || {}).forEach(roomId => {
            const current = currentStats.roomAnalytics.find(r => r.roomId === roomId);
            const lastYear = lastYearStats.byRoom[roomId];
            
            if (current && lastYear) {
                comparison.roomComparisons[roomId] = {
                    change: current.totalreservations - lastYear.count,
                    changePercent: lastYear.count > 0
                        ? Math.round(((current.totalreservations - lastYear.count) / lastYear.count) * 100)
                        : 0
                };
            }
        });

        return comparison;
    }

    async render() {
        if (!this.container) return;

        // Load last year data
        await this.loadLastYearData();
        const lastYearStats = this.calculateLastYearStats();

        const forecast = dataService.getForecast();
        if (!forecast) {
            this.container.innerHTML = `
                <div class="forecast-loading">
                    <div class="spinner"></div>
                    <p>Loading forecast data...</p>
                </div>
            `;
            return;
        }

        const { summary, roomAnalytics, weeklyTrends, recommendations } = forecast;
        const comparison = this.calculateComparison({ ...summary, roomAnalytics }, lastYearStats);

        this.container.innerHTML = `
            <!-- Hero Stats Section -->
            <div class="forecast-hero">
                <div class="hero-header">
                    <div>
                        <h2 class="hero-title">📊 Facility Analytics Dashboard</h2>
                        <p class="hero-subtitle">Real-time insights and predictions for BCHS facilities</p>
                    </div>
                    <div class="last-updated">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                        <span>Updated ${this.formatTimeAgo(forecast.lastUpdated)}</span>
                    </div>
                </div>
                
                <div class="hero-stats">
                    <div class="hero-stat-card primary">
                        <div class="hero-stat-icon">📅</div>
                        <div class="hero-stat-content">
                            <div class="hero-stat-value">${summary.totalreservations}</div>
                            <div class="hero-stat-label">Total Reservations</div>
                            ${comparison ? this.renderChangeIndicator(comparison.totalChange, comparison.totalChangePercent) : ''}
                        </div>
                    </div>
                    <div class="hero-stat-card secondary">
                        <div class="hero-stat-icon">🏆</div>
                        <div class="hero-stat-content">
                            <div class="hero-stat-value">${summary.mostPopularRoom}</div>
                            <div class="hero-stat-label">Most Popular Venue</div>
                        </div>
                    </div>
                    <div class="hero-stat-card accent">
                        <div class="hero-stat-icon">⏰</div>
                        <div class="hero-stat-content">
                            <div class="hero-stat-value">${summary.peakHours}</div>
                            <div class="hero-stat-label">Peak Hours</div>
                        </div>
                    </div>
                    <div class="hero-stat-card success">
                        <div class="hero-stat-icon">👥</div>
                        <div class="hero-stat-content">
                            <div class="hero-stat-value">${summary.averageAttendees}</div>
                            <div class="hero-stat-label">Avg Attendees</div>
                            ${comparison ? this.renderChangeIndicator(comparison.attendeesChange, comparison.attendeesChangePercent) : ''}
                        </div>
                    </div>
                </div>
            </div>

            <!-- Year Comparison - Prominent Position -->
            ${lastYearStats ? this.renderYearComparison(lastYearStats, summary) : ''}

            <!-- Busy Patterns Analysis -->
            ${lastYearStats ? this.renderBusyPatterns(lastYearStats) : ''}

            <!-- Room Analytics -->
            <div class="forecast-section">
                <div class="section-header">
                    <h3 class="section-title">
                        <span class="title-icon">🏢</span>
                        Facility Performance
                    </h3>
                    <span class="section-badge">${roomAnalytics.length} facilities</span>
                </div>
                <div class="room-analytics-grid">
                    ${roomAnalytics.map(room => this.renderRoomAnalytics(room, comparison)).join('')}
                </div>
            </div>

            <!-- Weekly Trends -->
            <div class="forecast-section">
                <div class="section-header">
                    <h3 class="section-title">
                        <span class="title-icon">📈</span>
                        Weekly Trends & Predictions
                    </h3>
                </div>
                <div class="trends-grid">
                    ${weeklyTrends.map(trend => this.renderWeeklyTrend(trend)).join('')}
                </div>
            </div>
        `;
    }

    formatTimeAgo(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'just now';
        if (diffMins < 60) return `${diffMins} min ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    }

    renderChangeIndicator(change, changePercent) {
        if (change === 0) return '<div class="stat-change neutral">No change</div>';
        
        const isPositive = change > 0;
        const arrow = isPositive ? '↑' : '↓';
        const colorClass = isPositive ? 'positive' : 'negative';
        
        return `
            <div class="stat-change ${colorClass}">
                ${arrow} ${Math.abs(change)} (${Math.abs(changePercent)}%) vs last year
            </div>
        `;
    }

    renderYearComparison(lastYearStats, currentStats) {
        const totalDiff = currentStats.totalreservations - lastYearStats.totalreservations;
        const totalPercent = lastYearStats.totalreservations > 0 
            ? Math.round((totalDiff / lastYearStats.totalreservations) * 100) 
            : 0;

        return `
            <div class="year-comparison-section">
                <div class="section-header">
                    <h3 class="section-title">
                        <span class="title-icon">📅</span>
                        Year-over-Year Performance
                    </h3>
                    <div class="comparison-summary ${totalDiff >= 0 ? 'positive' : 'negative'}">
                        <span class="summary-icon">${totalDiff >= 0 ? '📈' : '📉'}</span>
                        <span class="summary-text">
                            ${totalDiff >= 0 ? '+' : ''}${totalPercent}% ${totalDiff >= 0 ? 'growth' : 'decline'} from last year
                        </span>
                    </div>
                </div>

                <div class="comparison-container">
                    <div class="comparison-timeline">
                        <div class="timeline-item past">
                            <div class="timeline-marker"></div>
                            <div class="timeline-card">
                                <div class="timeline-year">2024</div>
                                <div class="timeline-label">Last Year</div>
                                <div class="timeline-stats">
                                    <div class="timeline-stat">
                                        <span class="stat-icon">📊</span>
                                        <div>
                                            <div class="stat-number">${lastYearStats.totalreservations}</div>
                                            <div class="stat-text">Reservations</div>
                                        </div>
                                    </div>
                                    <div class="timeline-stat">
                                        <span class="stat-icon">👥</span>
                                        <div>
                                            <div class="stat-number">${lastYearStats.averageAttendees}</div>
                                            <div class="stat-text">Avg Attendees</div>
                                        </div>
                                    </div>
                                    <div class="timeline-stat">
                                        <span class="stat-icon">🏆</span>
                                        <div>
                                            <div class="stat-number">${this.getRoomName(lastYearStats.mostPopularRoom)}</div>
                                            <div class="stat-text">Top Venue</div>
                                        </div>
                                    </div>
                                    <div class="timeline-stat">
                                        <span class="stat-icon">📆</span>
                                        <div>
                                            <div class="stat-number">${lastYearStats.busiestMonth}</div>
                                            <div class="stat-text">Busiest Month</div>
                                        </div>
                                    </div>
                                    <div class="timeline-stat">
                                        <span class="stat-icon">📅</span>
                                        <div>
                                            <div class="stat-number">${lastYearStats.busiestDayOfWeek}</div>
                                            <div class="stat-text">Busiest Day</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="timeline-connector">
                            <div class="connector-line"></div>
                            <div class="connector-badge ${totalDiff >= 0 ? 'positive' : 'negative'}">
                                ${totalDiff >= 0 ? '↑' : '↓'} ${Math.abs(totalPercent)}%
                            </div>
                        </div>

                        <div class="timeline-item current">
                            <div class="timeline-marker"></div>
                            <div class="timeline-card">
                                <div class="timeline-year">2025</div>
                                <div class="timeline-label">This Year</div>
                                <div class="timeline-stats">
                                    <div class="timeline-stat">
                                        <span class="stat-icon">📊</span>
                                        <div>
                                            <div class="stat-number">${currentStats.totalreservations}</div>
                                            <div class="stat-text">Reservations</div>
                                        </div>
                                    </div>
                                    <div class="timeline-stat">
                                        <span class="stat-icon">👥</span>
                                        <div>
                                            <div class="stat-number">${currentStats.averageAttendees}</div>
                                            <div class="stat-text">Avg Attendees</div>
                                        </div>
                                    </div>
                                    <div class="timeline-stat">
                                        <span class="stat-icon">🏆</span>
                                        <div>
                                            <div class="stat-number">${currentStats.mostPopularRoom}</div>
                                            <div class="stat-text">Top Venue</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="insights-panel">
                        <h4 class="insights-title">
                            <span>🔍</span>
                            Key Insights
                        </h4>
                        <div class="insights-list">
                            ${this.generateInsights(lastYearStats, currentStats)}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getRoomName(roomId) {
        const roomNames = {
            'auditorium': 'Auditorium',
            'library': 'Library',
            'grounds': 'Grounds',
            'gym': 'Gym',
            'avr': 'AVR'
        };
        return roomNames[roomId] || roomId;
    }

    generateInsights(lastYear, current) {
        const insights = [];
        
        const totalDiff = current.totalreservations - lastYear.totalreservations;
        const totalPercent = lastYear.totalreservations > 0 
            ? Math.round((totalDiff / lastYear.totalreservations) * 100) 
            : 0;
        
        if (totalDiff > 0) {
            insights.push(`
                <div class="insight-item positive">
                    <div class="insight-icon">📈</div>
                    <div class="insight-content">
                        <div class="insight-text">Reservations increased by <strong>${totalDiff}</strong> compared to last year</div>
                        <div class="insight-badge positive">+${totalPercent}%</div>
                    </div>
                </div>
            `);
        } else if (totalDiff < 0) {
            insights.push(`
                <div class="insight-item negative">
                    <div class="insight-icon">📉</div>
                    <div class="insight-content">
                        <div class="insight-text">Reservations decreased by <strong>${Math.abs(totalDiff)}</strong> compared to last year</div>
                        <div class="insight-badge negative">${totalPercent}%</div>
                    </div>
                </div>
            `);
        } else {
            insights.push(`
                <div class="insight-item neutral">
                    <div class="insight-icon">➡️</div>
                    <div class="insight-content">
                        <div class="insight-text">Reservation volume remained stable compared to last year</div>
                    </div>
                </div>
            `);
        }

        const attendeesDiff = current.averageAttendees - lastYear.averageAttendees;
        if (attendeesDiff !== 0) {
            const isPositive = attendeesDiff > 0;
            insights.push(`
                <div class="insight-item ${isPositive ? 'positive' : 'negative'}">
                    <div class="insight-icon">👥</div>
                    <div class="insight-content">
                        <div class="insight-text">Average event size ${isPositive ? 'grew' : 'decreased'} by <strong>${Math.abs(attendeesDiff)} attendees</strong></div>
                    </div>
                </div>
            `);
        }

        if (current.mostPopularRoom !== lastYear.mostPopularRoom) {
            insights.push(`
                <div class="insight-item info">
                    <div class="insight-icon">🔄</div>
                    <div class="insight-content">
                        <div class="insight-text">Most popular venue shifted from <strong>${this.getRoomName(lastYear.mostPopularRoom)}</strong> to <strong>${current.mostPopularRoom}</strong></div>
                    </div>
                </div>
            `);
        }

        return insights.join('');
    }

    renderBusyPatterns(lastYearStats) {
        // Sort months by count
        const monthEntries = Object.entries(lastYearStats.byMonth).sort((a, b) => b[1] - a[1]);
        const topMonths = monthEntries.slice(0, 5);

        // Sort days by count
        const dayEntries = Object.entries(lastYearStats.byDayOfWeek).sort((a, b) => b[1] - a[1]);

        return `
            <div class="forecast-section busy-patterns-section">
                <div class="section-header">
                    <h3 class="section-title">
                        <span class="title-icon">📊</span>
                        Historical Busy Patterns (2024)
                    </h3>
                    <span class="section-badge">Based on ${lastYearStats.totalreservations} reservations</span>
                </div>

                <div class="patterns-grid">
                    <!-- Busiest Months -->
                    <div class="pattern-card">
                        <div class="pattern-header">
                            <h4 class="pattern-title">
                                <span class="pattern-icon">📆</span>
                                Busiest Months
                            </h4>
                        </div>
                        <div class="pattern-body">
                            <div class="pattern-highlight">
                                <div class="highlight-label">Peak Month</div>
                                <div class="highlight-value">${lastYearStats.busiestMonth}</div>
                                <div class="highlight-count">${lastYearStats.busiestMonthCount} reservations</div>
                            </div>
                            <div class="pattern-bars">
                                ${topMonths.map(([month, count]) => {
                                    const percentage = (count / lastYearStats.totalreservations * 100).toFixed(1);
                                    const maxCount = topMonths[0][1];
                                    const barWidth = (count / maxCount * 100);
                                    return `
                                        <div class="pattern-bar-item">
                                            <div class="bar-label">${month}</div>
                                            <div class="bar-container">
                                                <div class="bar-fill" style="width: ${barWidth}%"></div>
                                            </div>
                                            <div class="bar-value">${count} <span class="bar-percent">(${percentage}%)</span></div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                    </div>

                    <!-- Busiest Days of Week -->
                    <div class="pattern-card">
                        <div class="pattern-header">
                            <h4 class="pattern-title">
                                <span class="pattern-icon">📅</span>
                                Busiest Days of Week
                            </h4>
                        </div>
                        <div class="pattern-body">
                            <div class="pattern-highlight">
                                <div class="highlight-label">Peak Day</div>
                                <div class="highlight-value">${lastYearStats.busiestDayOfWeek}</div>
                                <div class="highlight-count">${lastYearStats.busiestDayCount} reservations</div>
                            </div>
                            <div class="pattern-bars">
                                ${dayEntries.map(([day, count]) => {
                                    const percentage = (count / lastYearStats.totalreservations * 100).toFixed(1);
                                    const maxCount = dayEntries[0][1];
                                    const barWidth = (count / maxCount * 100);
                                    const dayShort = day.substring(0, 3);
                                    return `
                                        <div class="pattern-bar-item">
                                            <div class="bar-label">${dayShort}</div>
                                            <div class="bar-container">
                                                <div class="bar-fill day-bar" style="width: ${barWidth}%"></div>
                                            </div>
                                            <div class="bar-value">${count} <span class="bar-percent">(${percentage}%)</span></div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                    </div>
                </div>

                <div class="patterns-insight">
                    <div class="insight-icon">💡</div>
                    <div class="insight-text">
                        <strong>Planning Tip:</strong> ${lastYearStats.busiestMonth} and ${lastYearStats.busiestDayOfWeek}s were historically the busiest. 
                        Consider booking early during these peak periods or explore alternative dates for better availability.
                    </div>
                </div>
            </div>
        `;
    }

    renderRoomAnalytics(room, comparison) {
        const trendIcon = room.trend === 'increasing' ? '📈' : room.trend === 'decreasing' ? '📉' : '➡️';
        const trendClass = room.trend === 'increasing' ? 'positive' : room.trend === 'decreasing' ? 'negative' : 'neutral';
        const roomComparison = comparison?.roomComparisons?.[room.roomId];

        // Get room icon
        const roomIcons = {
            'auditorium': '🎭',
            'library': '📚',
            'grounds': '🌳',
            'gym': '🏀',
            'avr': '📽️'
        };
        const roomIcon = roomIcons[room.roomId] || '🏢';

        return `
            <div class="room-card">
                <div class="room-card-header">
                    <div class="room-info">
                        <span class="room-icon">${roomIcon}</span>
                        <div>
                            <h4 class="room-name">${room.roomName}</h4>
                            <span class="room-trend ${trendClass}">
                                ${trendIcon} ${room.trend}
                            </span>
                        </div>
                    </div>
                    <div class="room-utilization">
                        <div class="utilization-circle">
                            <svg viewBox="0 0 36 36" class="circular-chart">
                                <path class="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
                                <path class="circle" stroke-dasharray="${room.utilizationRate.replace('%', '')}, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
                                <text x="18" y="20.35" class="percentage">${room.utilizationRate}</text>
                            </svg>
                        </div>
                    </div>
                </div>

                <div class="room-card-body">
                    <div class="room-stats-grid">
                        <div class="room-stat">
                            <div class="room-stat-label">Total Reservations</div>
                            <div class="room-stat-value">${room.totalreservations}</div>
                            ${roomComparison ? `
                                <div class="room-stat-change ${roomComparison.change >= 0 ? 'positive' : 'negative'}">
                                    ${roomComparison.change >= 0 ? '↑' : '↓'} ${Math.abs(roomComparison.changePercent)}% vs last year
                                </div>
                            ` : ''}
                        </div>
                        <div class="room-stat">
                            <div class="room-stat-label">Avg Attendees</div>
                            <div class="room-stat-value">${room.averageAttendees}</div>
                        </div>
                        <div class="room-stat">
                            <div class="room-stat-label">Peak Days</div>
                            <div class="room-stat-value small">${Array.isArray(room.peakDays) ? room.peakDays.join(', ') : room.peakDays}</div>
                        </div>
                        <div class="room-stat prediction-stat">
                            <div class="room-stat-label">
                                <span>🔮</span> Next Week
                            </div>
                            <div class="room-stat-value">${room.predictedNextWeek}</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderWeeklyTrend(trend) {
        const isCurrentWeek = trend.week.includes('Current');
        const isPrediction = trend.week.includes('Predicted');

        return `
            <div class="trend-card ${isPrediction ? 'prediction' : ''}">
                <div class="trend-header">
                    <h4>${trend.week}</h4>
                    ${isPrediction ? '<span class="prediction-badge">🔮 Predicted</span>' : ''}
                </div>
                <div class="trend-stats">
                    <div class="trend-stat">
                        <span class="trend-stat-label">Total:</span>
                        <span class="trend-stat-value">${trend.totalreservations}</span>
                    </div>
                    <div class="trend-breakdown">
                        <div class="trend-item">
                            <span>Auditorium:</span>
                            <strong>${trend.auditorium}</strong>
                        </div>
                        <div class="trend-item">
                            <span>Library:</span>
                            <strong>${trend.library}</strong>
                        </div>
                        <div class="trend-item">
                            <span>Grounds:</span>
                            <strong>${trend.grounds}</strong>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderWeeklyTrend(trend) {
        const isPrediction = trend.week.includes('Predicted');

        return `
            <div class="trend-card ${isPrediction ? 'prediction' : 'current'}">
                <div class="trend-card-header">
                    <h4 class="trend-title">${trend.week}</h4>
                    ${isPrediction ? '<span class="prediction-badge"><span>🔮</span> AI Prediction</span>' : '<span class="current-badge"><span>📊</span> Actual Data</span>'}
                </div>
                <div class="trend-card-body">
                    <div class="trend-total">
                        <div class="trend-total-label">Total Reservations</div>
                        <div class="trend-total-value">${trend.totalreservations}</div>
                    </div>
                    <div class="trend-breakdown">
                        <div class="breakdown-item">
                            <div class="breakdown-bar">
                                <div class="breakdown-fill auditorium" style="width: ${(trend.auditorium / trend.totalreservations * 100)}%"></div>
                            </div>
                            <div class="breakdown-info">
                                <span class="breakdown-icon">🎭</span>
                                <span class="breakdown-name">Auditorium</span>
                                <span class="breakdown-value">${trend.auditorium}</span>
                            </div>
                        </div>
                        <div class="breakdown-item">
                            <div class="breakdown-bar">
                                <div class="breakdown-fill library" style="width: ${(trend.library / trend.totalreservations * 100)}%"></div>
                            </div>
                            <div class="breakdown-info">
                                <span class="breakdown-icon">📚</span>
                                <span class="breakdown-name">Library</span>
                                <span class="breakdown-value">${trend.library}</span>
                            </div>
                        </div>
                        <div class="breakdown-item">
                            <div class="breakdown-bar">
                                <div class="breakdown-fill grounds" style="width: ${(trend.grounds / trend.totalreservations * 100)}%"></div>
                            </div>
                            <div class="breakdown-info">
                                <span class="breakdown-icon">🌳</span>
                                <span class="breakdown-name">Grounds</span>
                                <span class="breakdown-value">${trend.grounds}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderRecommendation(rec) {
        const priorityConfig = {
            high: { color: '#ef4444', icon: '🔴', label: 'High Priority' },
            medium: { color: '#f59e0b', icon: '🟡', label: 'Medium Priority' },
            low: { color: '#10b981', icon: '🟢', label: 'Low Priority' }
        };

        const config = priorityConfig[rec.priority] || priorityConfig.medium;

        return `
            <div class="recommendation-card ${rec.priority}">
                <div class="recommendation-priority-badge" style="background-color: ${config.color}">
                    <span class="priority-icon">${config.icon}</span>
                    <span class="priority-label">${config.label}</span>
                </div>
                <div class="recommendation-content">
                    <p class="recommendation-text">${rec.message}</p>
                </div>
                <div class="recommendation-action">
                    <button class="action-btn" onclick="alert('Feature coming soon!')">
                        <span>Take Action</span>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                            <polyline points="12 5 19 12 12 19"></polyline>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    }
}
