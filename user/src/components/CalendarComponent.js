/**
 * Calendar Component
 * Handles calendar display, date selection, and reservation density legend.
 */

import { state, setSelectedDate } from '../core/state.js';
import { getMonthYear, getDaysInMonth, getFirstDayOfMonth, isToday, isSameDate, formatDate, isPastDate, getLocalISODate } from '../utils/dateUtils.js';
import { getreservationDensity, getreservationsForDate } from '../services/reservationService.js';
import { TimeSlots } from './TimeSlotsComponent.js';
import { showToast } from './NotificationComponent.js';

export class Calendar {
    constructor() {
        this.container = document.getElementById('calendar-grid');
        this.monthYearEl = document.getElementById('calendar-month-year');
        this.roomTitleEl = document.getElementById('calendar-room-title');
        this.sectionEl = document.querySelector('.calendar-section');
    }

    render() {
        if (!this.container || !state.selectedRoom) return;

        this.roomTitleEl.textContent = `Calendar - ${state.selectedRoom.name}`;
        this.monthYearEl.textContent = getMonthYear(state.currentMonth, state.currentYear);

        const daysInMonth = getDaysInMonth(state.currentMonth, state.currentYear);
        const firstDay = getFirstDayOfMonth(state.currentMonth, state.currentYear);

        let html = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
            .map(day => `<div class="day-header">${day}</div>`)
            .join('');

        // Empty cells before first day
        for (let i = 0; i < firstDay; i++) {
            html += '<div></div>';
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Render day cells
        for (let day = 1; day <= daysInMonth; day++) {
            html += this.renderDayCell(day, today);
        }

        this.container.innerHTML = html;
        this.updateGroundsNote();
        this.updateRequestButton();
        this.renderLegend();
        this.attachEventListeners();
    }

    renderDayCell(day, today) {
        const date = new Date(state.currentYear, state.currentMonth, day);
        date.setHours(0, 0, 0, 0);
        const dateStr = getLocalISODate(date);
        
        const isCurrentDay = isToday(day, state.currentMonth, state.currentYear);
        const selected = isSameDate(state.selectedDate, date);
        const density = getreservationDensity(state.selectedRoom.id, day, state.currentMonth, state.currentYear);

        const dayreservations = getreservationsForDate(state.selectedRoom.id, dateStr);
        const hasPending = dayreservations.some(b => b.status === 'pending');
        const hasApproved = dayreservations.some(b => b.status === 'approved' || b.status === 'accepted');
        const isAdminBlocked = dayreservations.some(b => b.status === 'blocked' && b.isFullDayBlock);

        const dayOfWeek = date.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const isPast = date < today;

        // Hard disabled states: Past dates or Grounds on weekends
        const isDisabled = isPast || (state.selectedRoom.id === 'grounds' && isWeekend);

        let bgColor = 'transparent';
        if (isAdminBlocked) {
            bgColor = '#4b5563'; // Admin Blocked Dark Gray
        } else if (isDisabled) {
            bgColor = isPast && !isWeekend ? '#e5e7eb' : '#4b5563';
        } else if (selected) {
            bgColor = 'var(--calendar-selected-bg)';
        } else if (isCurrentDay) {
            bgColor = 'var(--calendar-today-bg)';
        } else if (density === 'full') {
            bgColor = 'var(--calendar-full-bg)';
        } else if (density === 'busy') {
            bgColor = 'var(--calendar-busy-bg)';
        } else if (density === 'light') {
            bgColor = 'var(--calendar-light-bg)';
        } else if (hasPending && !hasApproved) {
            bgColor = 'var(--calendar-pending-bg)';
        }

        const closedStyle = isDisabled 
            ? `background-color: ${bgColor}; opacity: ${isPast && !isWeekend ? '0.4' : '0.6'}; color: #9ca3af; cursor: not-allowed;` 
            : `background-color: ${bgColor};`;

        const todayRing = isCurrentDay && !selected && !isDisabled 
            ? 'box-shadow: 0 0 0 2px var(--calendar-today-ring);' 
            : '';

        // Pending marker
        const pendingMarker = (hasPending && hasApproved && !selected) 
            ? '<span style="position: absolute; top: 4px; right: 4px; width: 6px; height: 6px; background-color: var(--status-pending); border-radius: 50%;"></span>' 
            : '';

        // Reason/Label for states
        let label = '';
        if (isAdminBlocked) label = '🚫 Blocked';
        else if (isDisabled) label = isPast && !isWeekend ? 'Past' : 'Closed';

        return `
            <button 
                class="day-cell" 
                data-day="${day}" 
                data-blocked="${isAdminBlocked}"
                ${isDisabled ? `disabled style="${closedStyle}"` : `style="${closedStyle} ${todayRing}"`}
            >
                ${pendingMarker}
                <span>${day}</span>
                ${label ? `<span style="font-size: 8px; position: absolute; bottom: 2px;">${label}</span>` : ''}
            </button>
        `;
    }

    /**
     * Renders the color legend for the calendar
     */
    renderLegend() {
        // Use a stable mount point for the legend within the section
        let legend = document.getElementById('calendar-legend');
        if (!legend) {
            legend = document.createElement('div');
            legend.id = 'calendar-legend';
            legend.className = 'calendar-legend';
            this.sectionEl.appendChild(legend);
        }

        const items = [
            { color: 'var(--calendar-full-bg)', label: 'Full (70%+ Reserved)' },
            { color: 'var(--calendar-busy-bg)', label: 'Busy (High Demand)' },
            { color: 'var(--calendar-light-bg)', label: 'Light Activity' },
            { color: 'var(--calendar-pending-bg)', label: 'Pending Request' },
            { color: 'var(--calendar-selected-bg)', label: 'Your Selected Date' },
            { color: 'var(--calendar-today-bg)', label: 'Today', border: 'var(--calendar-today-ring)' },
            { color: '#4b5563', label: 'Unavailable / Blocked' }
        ];

        legend.innerHTML = items.map(item => `
            <div class="legend-item">
                <div class="legend-color" style="background-color: ${item.color}; ${item.border ? `box-shadow: 0 0 0 2px ${item.border}` : ''}"></div>
                <span>${item.label}</span>
            </div>
        `).join('');
    }

    updateGroundsNote() {
        const groundsNote = document.getElementById('grounds-note');
        if (groundsNote) {
            groundsNote.style.display = state.selectedRoom.id === 'grounds' ? 'block' : 'none';
        }
    }

    updateRequestButton() {
        const requestBtn = document.getElementById('request-btn');
        if (!requestBtn) return;

        const isPast = isPastDate(state.selectedDate);
        const dayOfWeek = state.selectedDate.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const isGroundsWeekend = state.selectedRoom.id === 'grounds' && isWeekend;

        const dayreservations = getreservationsForDate(state.selectedRoom.id, getLocalISODate(state.selectedDate));
        const isBlocked = dayreservations.some(b => b.status === 'blocked' && b.isFullDayBlock);

        // We keep it clickable to show the toast on press for admin blocks.
        const isDisabled = isPast || isGroundsWeekend;

        requestBtn.disabled = isDisabled;
        requestBtn.style.backgroundColor = (isDisabled || isBlocked) ? '#ef4444' : 'var(--button-primary)';
        requestBtn.style.cursor = isDisabled ? 'not-allowed' : 'pointer';
        requestBtn.style.opacity = isDisabled ? '0.6' : '1';
        
        if (isBlocked) {
            requestBtn.title = 'This facility is currently unavailable';
        } else if (isDisabled) {
            requestBtn.title = isPast ? 'Cannot request reservations for past dates' : 'Facility closed on weekends';
        } else {
            requestBtn.title = '';
        }
    }

    attachEventListeners() {
        document.querySelectorAll('.day-cell').forEach(cell => {
            if (!cell.disabled) {
                cell.addEventListener('click', () => {
                    const isBlocked = cell.dataset.blocked === 'true';
                    if (isBlocked) {
                        showToast('This day is unavailable for reservations.', 'error');
                        return; // Do not select the date
                    }

                    const day = parseInt(cell.dataset.day);
                    setSelectedDate(new Date(state.currentYear, state.currentMonth, day));
                    this.render();
                    
                    const timeSlots = new TimeSlots();
                    timeSlots.render();

                    const dateText = document.getElementById('selected-date-text');
                    if (dateText) {
                        dateText.textContent = formatDate(state.selectedDate);
                    }
                });
            }
        });
    }

    previousMonth() {
        state.currentMonth--;
        if (state.currentMonth < 0) {
            state.currentMonth = 11;
            state.currentYear--;
        }
        this.render();
    }

    nextMonth() {
        state.currentMonth++;
        if (state.currentMonth > 11) {
            state.currentMonth = 0;
            state.currentYear++;
        }
        this.render();
    }
}