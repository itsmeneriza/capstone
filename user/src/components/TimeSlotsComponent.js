/**
 * Time Slots Component
 * Shows Daily Schedule and Facility Visual Preview.
 */

import { state } from '../core/state.js';
import { formatDate, getLocalISODate, convertTo12Hour } from '../utils/dateUtils.js';
import { getreservationsForDate } from '../services/reservationService.js';
import { dataService } from '../services/dataService.js';

export class TimeSlots {
    constructor() {
        this.container = document.getElementById('timeslots-container');
        this.previewWrapper = document.getElementById('facility-preview-wrapper');
        this.dateText = document.getElementById('selected-date-text');
        
        // Viewer Modal elements
        this.viewerModal = document.getElementById('image-viewer-modal');
        this.viewerImage = document.getElementById('viewer-image');
        this.viewerCaption = document.getElementById('viewer-caption');
        this.viewerClose = document.getElementById('viewer-close');
        
        this.setupViewer();
    }

    setupViewer() {
        if (!this.viewerClose) return;
        this.viewerClose.onclick = () => this.viewerModal.classList.remove('active');
        this.viewerModal.onclick = (e) => {
            if (e.target === this.viewerModal) {
                this.viewerModal.classList.remove('active');
            }
        };
    }

    render() {
        if (!this.container || !state.selectedRoom) return;

        // 1. Render Facility Preview Image
        this.renderFacilityPreview();

        // 2. Update Header Date
        if (this.dateText) {
            this.dateText.textContent = formatDate(state.selectedDate);
        }

        const dateStr = getLocalISODate(state.selectedDate);
        const dayreservations = getreservationsForDate(state.selectedRoom.id, dateStr);

        // Sort entries by start time
        dayreservations.sort((a, b) => a.startTime.localeCompare(b.startTime));

        let html = '';

        // --- SCHEDULE LIST ---
        html += `<div class="timeslot-section">
                    <div class="timeslot-header">Daily Schedule (${dayreservations.length})</div>
                    <div class="timeslot-list">`;

        if (dayreservations.length > 0) {
            dayreservations.forEach(reservation => {
                const start12 = convertTo12Hour(reservation.startTime);
                const end12 = convertTo12Hour(reservation.endTime);
                const isPending = reservation.status === 'pending';
                const isBlocked = reservation.status === 'blocked';
                
                let label = 'Reserved';
                let styleClass = 'timeslot-booked';
                let subLabel = '';

                if (isPending) {
                    label = 'Pending Review';
                    styleClass = 'timeslot-pending';
                } else if (isBlocked) {
                    label = 'UNAVAILABLE';
                    styleClass = 'timeslot-blocked-admin';
                    subLabel = `<div style="font-size: 11px; opacity: 0.8; font-weight: normal; margin-top: 2px;">${reservation.purpose.replace('FACILITY UNAVAILABLE: ', '')}</div>`;
                }
                
                html += `
                    <div class="timeslot ${styleClass}" data-reservation-id="${reservation.id}">
                        <svg class="icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            ${isBlocked ? 
                                '<circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>' :
                                (isPending ? 
                                    '<circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>' : 
                                    '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line>'
                                )
                            }
                        </svg>
                        <div style="flex: 1;">
                            <div style="font-weight: 600;">${start12} - ${end12}</div>
                            <div class="timeslot-info" style="font-weight: 700; text-transform: uppercase; font-size: 12px;">
                                ${label}
                                ${subLabel}
                            </div>
                        </div>
                    </div>
                `;
            });
        } else {
            html += `<div class="empty-slots">No reservations or requests for this date</div>`;
        }
        html += `</div></div>`;

        this.container.innerHTML = html;
        this.attachEventListeners();
    }

    renderFacilityPreview() {
        if (!this.previewWrapper) return;

        const imageUrl = dataService.getFacilityImage(state.selectedRoom.id);
        const roomName = state.selectedRoom.name;
        const capacity = state.selectedRoom.capacity;

        this.previewWrapper.innerHTML = `
            <div class="facility-preview-card" title="Click to enlarge view">
                <img src="${imageUrl}" alt="${roomName}" class="preview-img">
                <div class="preview-overlay">
                    <span class="preview-name">${roomName}</span>
                    <span class="preview-pax">${capacity} Pax Max</span>
                </div>
                <div class="zoom-indicator">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                        <circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line>
                    </svg>
                </div>
            </div>
        `;

        this.previewWrapper.querySelector('.facility-preview-card').onclick = () => {
            this.viewerImage.src = imageUrl;
            this.viewerCaption.textContent = `${roomName} - School Facility (Max ${capacity} Pax)`;
            this.viewerModal.classList.add('active');
        };
    }

    attachEventListeners() {
        // Cancellation feature removed - all slots are now non-interactive
    }
}