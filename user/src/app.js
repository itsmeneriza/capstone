/**
 * BCHS reservation System - Main Application
 */

import { state, setSelectedRoom } from './core/state.js';
import { loadData } from './services/reservationService.js';
import { RoomList } from './components/RoomListComponent.js';
import { Calendar } from './components/CalendarComponent.js';
import { TimeSlots } from './components/TimeSlotsComponent.js';
import { Chat } from './components/ChatComponent.js';
import { reservationModal } from './components/reservationModalComponent.js';
import { Forecast } from './components/ForecastComponent.js';
import { CancellationHandler } from './components/CancellationComponent.js';
import { LoginHandler } from './components/LoginComponent.js';
import { MyRequests } from './components/MyRequestsComponent.js';

class reservationApp {
    constructor() {
        this.roomList = new RoomList();
        this.calendar = new Calendar();
        this.timeSlots = new TimeSlots();
        this.chat = new Chat();
        this.reservationModal = new reservationModal();
        this.forecast = new Forecast();
        this.cancellationHandler = new CancellationHandler();
        this.loginHandler = new LoginHandler();
        this.myRequests = new MyRequests();
    }

    async init() {
        console.log('🚀 Initializing BCHS reservation System...');

        try {
            const dataLoaded = await loadData();
            if (!dataLoaded) {
                console.error('❌ Failed to load data');
                alert('System initialized with offline data or failed to load. Some features may be limited.');
            }

            if (state.rooms.length > 0) {
                setSelectedRoom(state.rooms[0]);
            } else {
                console.warn('⚠️ No rooms found in data.');
            }

            this.roomList.render();
            this.calendar.render();
            this.timeSlots.render();
            this.chat.init();
            this.reservationModal.init();
            this.forecast.render();
            this.myRequests.render();
            this.initEventListeners();
            this.setupAutoRefresh();

            console.log('✅ BCHS reservation System initialized successfully');
        } catch (error) {
            console.error('❌ Critical error during app initialization:', error);
        }
    }

    initEventListeners() {
        // Calendar navigation
        const prevMonthBtn = document.getElementById('prev-month');
        const nextMonthBtn = document.getElementById('next-month');

        if (prevMonthBtn) prevMonthBtn.addEventListener('click', () => {
            this.calendar.previousMonth();
        });
        
        if (nextMonthBtn) nextMonthBtn.addEventListener('click', () => {
            this.calendar.nextMonth();
        });

        // Tab navigation
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => this.handleTabClick(btn));
        });
    }

    handleTabClick(btn) {
        const tab = btn.dataset.tab;

        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });

        const tabContent = document.getElementById(`${tab}-tab`);
        if (tabContent) tabContent.classList.add('active');
        
        // Render My Requests when tab is clicked
        if (tab === 'my-requests') {
            this.myRequests.render();
        }
    }

    /**
     * Setup auto-refresh when page regains focus
     * This updates the calendar when returning from admin panel
     */
    setupAutoRefresh() {
        // Reload reservations when page becomes visible again
        document.addEventListener('visibilitychange', async () => {
            if (!document.hidden) {
                console.log('🔄 Page visible - refreshing reservations...');
                await loadData();
                this.calendar.render();
                this.timeSlots.render();
            }
        });
        
        // Also refresh when window regains focus
        window.addEventListener('focus', async () => {
            console.log('🔄 Window focused - refreshing reservations...');
            await loadData();
            this.calendar.render();
            this.timeSlots.render();
        });
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const app = new reservationApp();
    app.init();
});