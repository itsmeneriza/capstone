/**
 * Room List Component
 * Displays available rooms with pagination (3 per page)
 * Updated: Navigation buttons now flank the room cards.
 */

import { state, setSelectedRoom } from '../core/state.js';
import { Calendar } from './CalendarComponent.js';
import { TimeSlots } from './TimeSlotsComponent.js';

export class RoomList {
    constructor() {
        this.container = document.getElementById('room-list');
        this.itemsPerPage = 3;
        this.currentPage = 0;
    }

    render() {
        if (!this.container) return;

        this.container.innerHTML = '';
        
        const totalRooms = state.rooms.length;
        const startIndex = this.currentPage * this.itemsPerPage;
        const visibleRooms = state.rooms.slice(startIndex, startIndex + this.itemsPerPage);
        const totalPages = Math.ceil(totalRooms / this.itemsPerPage);

        // Main Wrapper for side-by-side layout
        const selectorWrapper = document.createElement('div');
        selectorWrapper.className = 'room-selector-wrapper';

        // Previous Button (Left Side)
        const prevBtn = document.createElement('button');
        prevBtn.className = 'side-nav-btn prev';
        prevBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
        `;
        prevBtn.disabled = this.currentPage === 0;
        prevBtn.title = "Previous Rooms";
        prevBtn.onclick = (e) => {
            e.stopPropagation();
            if (this.currentPage > 0) {
                this.currentPage--;
                this.render();
            }
        };

        // Middle container for room cards
        const listWrapper = document.createElement('div');
        listWrapper.className = 'room-list-inner';

        visibleRooms.forEach(room => {
            const roomCard = document.createElement('button');
            roomCard.className = 'room-card-mini';

            if (state.selectedRoom && state.selectedRoom.id === room.id) {
                roomCard.classList.add('selected');
            }

            // HTML structure: Compact view for sidebar
            roomCard.innerHTML = `
                <div class="room-info">
                    <div class="room-name">${room.name}</div>
                    <div class="room-capacity-badge">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                            <circle cx="9" cy="7" r="4"></circle>
                        </svg>
                        <span>${room.capacity}</span>
                    </div>
                </div>
            `;

            roomCard.addEventListener('click', () => this.selectRoom(room));
            listWrapper.appendChild(roomCard);
        });

        // Next Button (Right Side)
        const nextBtn = document.createElement('button');
        nextBtn.className = 'side-nav-btn next';
        nextBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
        `;
        nextBtn.disabled = startIndex + this.itemsPerPage >= totalRooms;
        nextBtn.title = "Next Rooms";
        nextBtn.onclick = (e) => {
            e.stopPropagation();
            if (startIndex + this.itemsPerPage < totalRooms) {
                this.currentPage++;
                this.render();
            }
        };

        // Assemble parts
        selectorWrapper.appendChild(prevBtn);
        selectorWrapper.appendChild(listWrapper);
        selectorWrapper.appendChild(nextBtn);
        
        this.container.appendChild(selectorWrapper);

        // Indicators (dots) at the bottom if multiple pages
        if (totalPages > 1) {
            const dotsContainer = document.createElement('div');
            dotsContainer.className = 'pagination-dots';
            for (let i = 0; i < totalPages; i++) {
                const dot = document.createElement('div');
                dot.className = `pagination-dot ${i === this.currentPage ? 'active' : ''}`;
                dotsContainer.appendChild(dot);
            }
            this.container.appendChild(dotsContainer);
        }
    }

    selectRoom(room) {
        setSelectedRoom(room);
        this.render();

        const calendar = new Calendar();
        calendar.render();

        const timeSlots = new TimeSlots();
        timeSlots.render();
    }
}