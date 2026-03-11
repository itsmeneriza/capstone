/**
 * reservation Modal Component
 * Handles reservation request form interactions, dynamic time filtering, and purpose-based venue suggestions.
 */

import { state } from '../core/state.js';
import { convertTo12Hour, isPastDate, getLocalISODate } from '../utils/dateUtils.js';
import { savereservationRequest, findConflict, getBookedSlots, getreservationsForDate } from '../services/reservationService.js';
import { Calendar } from './CalendarComponent.js';
import { TimeSlots } from './TimeSlotsComponent.js';
import { showToast } from './NotificationComponent.js';

export class reservationModal {
    constructor() {
        this.modal = document.getElementById('request-modal');
        this.policyModal = document.getElementById('policy-modal');
        this.form = document.getElementById('request-form');
        this.durationInfo = document.getElementById('duration-info');
        this.conflictWarning = document.getElementById('conflict-warning');
        this.suggestionBox = null;
        this.pendingRequestData = null;

        this.inputs = {
            name: document.getElementById('req-name'),
            email: document.getElementById('req-email'),
            contact: document.getElementById('req-contact'),
            date: document.getElementById('req-date'),
            attendees: document.getElementById('req-attendees'),
            purposeSelect: document.getElementById('req-purpose-select'),
            purposeCustom: document.getElementById('req-purpose-custom'),
            startTime: document.getElementById('req-start-time'),
            endTime: document.getElementById('req-end-time'),
            notes: document.getElementById('req-notes')
        };
    }

    init() {
        this.injectUIElements();
        this.attachEventListeners();
    }

    injectUIElements() {
        const footer = this.form.querySelector('.modal-footer');
        
        // 1. Payment Notice
        const notice = document.createElement('div');
        notice.style.cssText = 'background: #f0fdf4; border: 1px solid #749965; padding: 12px; border-radius: 6px; margin-bottom: 16px; font-size: 13px; color: #3f6212;';
        notice.innerHTML = `<strong>Payment Deadline:</strong> Settlement must be made <strong>3 working days prior</strong> to the event. Unpaid reservations risk loss of priority to school activities.`;
        this.form.insertBefore(notice, footer);

        // 2. Suggestion Box (Styled as a Tip)
        this.suggestionBox = document.createElement('div');
        this.suggestionBox.id = 'venue-suggestion';
        this.suggestionBox.style.cssText = 'background: #fdf4ff; border: 1px solid #d946ef; padding: 12px; border-radius: 6px; margin-bottom: 16px; font-size: 13px; color: #701a75; display: none;';
        this.form.insertBefore(this.suggestionBox, notice);
    }

    open() {
        // --- AUTH CHECK ---
        if (!state.isLoggedIn) {
            showToast('Please login to request a reservation.', 'info');
            document.getElementById('login-modal').classList.add('active');
            return;
        }

        const todayStr = getLocalISODate(new Date());
        const selectedDateStr = getLocalISODate(state.selectedDate);

        // --- ADMIN BLOCK CHECK ---
        const dayreservations = getreservationsForDate(state.selectedRoom.id, selectedDateStr);
        const isBlocked = dayreservations.some(b => b.status === 'blocked' && b.isFullDayBlock);

        if (isBlocked) {
            showToast('This facility is unavailable on the selected date.', 'error');
            return;
        }
        // --------------------------

        if (this.inputs.date) {
            this.inputs.date.value = selectedDateStr;
            this.inputs.date.min = todayStr;
        }

        // Auto-fill form for logged in users
        if (state.user) {
            // Auto-fill contact number
            if (state.user.phone) {
                this.inputs.contact.value = state.user.phone;
            }
            
            // Auto-fill name and email for staff members
            if (state.user.isStaff) {
                if (state.user.name) {
                    this.inputs.name.value = state.user.name;
                }
                
                // Use staff email from database
                if (state.user.email) {
                    this.inputs.email.value = state.user.email;
                }
            }
        }

        this.updateAvailableTimes();
        this.updateDurationInfo();
        this.checkTimeConflict();
        this.modal.classList.add('active');
    }

    updateAvailableTimes() {
        const dateVal = this.inputs.date.value;
        if (!dateVal) return;

        const bookedTimeRanges = getBookedSlots(state.selectedRoom.id, dateVal);
        const takenHours = new Set();
        bookedTimeRanges.forEach(range => {
            const [start, end] = range.split('-');
            const startH = parseInt(start.split(':')[0]);
            const endH = parseInt(end.split(':')[0]);
            for (let h = startH; h < endH; h++) {
                takenHours.add(`${String(h).padStart(2, '0')}:00`);
            }
        });

        this.filterSelectOptions(this.inputs.startTime, takenHours, false);
        this.filterSelectOptions(this.inputs.endTime, takenHours, true);
    }

    filterSelectOptions(selectEl, takenHours, isEndTime) {
        const options = selectEl.querySelectorAll('option');
        options.forEach(opt => {
            if (!opt.value) return;
            const isReserved = takenHours.has(opt.value);
            if (isReserved) {
                opt.style.color = '#ef4444'; 
                opt.style.backgroundColor = '#fee2e2'; 
                opt.disabled = true;
                opt.textContent = opt.textContent.includes('(Unavailable)') ? opt.textContent : `${opt.textContent} (Unavailable)`;
            } else {
                opt.style.color = 'inherit';
                opt.style.backgroundColor = 'inherit';
                opt.disabled = false;
                opt.textContent = opt.textContent.replace(' (Unavailable)', '');
            }
        });
        if (selectEl.selectedOptions[0]?.disabled) selectEl.value = '';
    }

    /**
     * Enhanced AI-based Venue Recommendation
     * Suggests the absolute best fit based on purpose mapping and pax efficiency.
     */
    updateVenueSuggestion() {
        const attendees = parseInt(this.inputs.attendees.value) || 0;
        
        // Get purpose from dropdown or custom input
        const purposeValue = this.inputs.purposeSelect.value === 'other' 
            ? this.inputs.purposeCustom.value 
            : this.inputs.purposeSelect.value;
        const purpose = (purposeValue || '').toLowerCase();
        
        if (attendees === 0 && !purpose) {
            this.suggestionBox.style.display = 'none';
            return;
        }

        const currentRoom = state.selectedRoom;
        let recommendation = null;

        // 1. HARD CONSTRAINT: Over Pax Limit
        if (attendees > currentRoom.capacity) {
            const fits = state.rooms.filter(r => r.capacity >= attendees).sort((a, b) => a.capacity - b.capacity);
            if (fits.length > 0) {
                recommendation = `⚠️ <strong>Over Pax Limit:</strong> ${currentRoom.name} fits ${currentRoom.capacity} pax. We recommend moving to the <strong>${fits[0].name}</strong> (${fits[0].capacity} pax limit) to accommodate your ${attendees} guests safely.`;
            } else {
                recommendation = `⚠️ <strong>Extreme Pax Warning:</strong> Your request for ${attendees} pax exceeds our largest facility (${state.rooms.sort((a,b)=>b.capacity-a.capacity)[0].name}). Please contact Admin for special arrangements.`;
            }
        }

        // 2. SOFT CONSTRAINT: Purpose/Facility Alignment (if not already over capacity)
        if (!recommendation && purpose) {
            const mappings = [
                { id: 'library', keywords: ['study', 'quiet', 'research', 'read', 'exam', 'book', 'writing'], name: 'Library', reason: 'optimized for academic research and quiet study' },
                { id: 'gym', keywords: ['sport', 'game', 'basketball', 'volleyball', 'practice', 'training', 'dance', 'exercise', 'physical'], name: 'Gym', reason: 'equipped for physical education and high-impact sports' },
                { id: 'avr', keywords: ['media', 'audio', 'video', 'film', 'movie', 'projection', 'presentation', 'slides', 'multimedia', 'tech'], name: 'AVR', reason: 'fully equipped with specialized audio-visual technology' },
                { id: 'auditorium', keywords: ['graduation', 'concert', 'assembly', 'performance', 'stage', 'seminar', 'summit', 'convention', 'theater'], name: 'Auditorium', reason: 'our premier venue for large-scale performances and formal assemblies' },
                { id: 'grounds', keywords: ['outdoor', 'festival', 'rally', 'drill', 'field', 'open air', 'track', 'camp'], name: 'Grounds', reason: 'the best choice for outdoor activities and large-scale gatherings' }
            ];

            const bestMapping = mappings.find(m => m.keywords.some(k => purpose.includes(k)));

            if (bestMapping && currentRoom.id !== bestMapping.id) {
                // Only recommend if the best match actually fits the pax
                const targetRoom = state.rooms.find(r => r.id === bestMapping.id);
                if (targetRoom && targetRoom.capacity >= attendees) {
                    recommendation = `💡 <strong>Smart Recommendation:</strong> Based on your purpose ("${purpose.split(' ')[0]}..."), the <strong>${bestMapping.name}</strong> is a better suited facility. It is ${bestMapping.reason}.`;
                }
            }
        }

        // 3. EFFICIENCY: Suggesting a smaller room if way under capacity
        if (!recommendation && attendees > 0 && attendees < (currentRoom.capacity * 0.2)) {
            const smallerRoom = state.rooms
                .filter(r => r.capacity >= attendees && r.capacity < currentRoom.capacity)
                .sort((a,b) => a.capacity - b.capacity)[0];
            
            if (smallerRoom) {
                recommendation = `ℹ️ <strong>Capacity Note:</strong> This facility fits ${currentRoom.capacity} pax. Since you only have ${attendees} pax, you might prefer the more intimate <strong>${smallerRoom.name}</strong> (${smallerRoom.capacity} pax).`;
            }
        }

        if (recommendation) {
            this.suggestionBox.innerHTML = recommendation;
            this.suggestionBox.style.display = 'block';
        } else {
            this.suggestionBox.style.display = 'none';
        }
    }

    close() {
        this.modal.classList.remove('active');
        this.form.reset();
        this.durationInfo.style.display = 'none';
        this.conflictWarning.style.display = 'none';
        this.suggestionBox.style.display = 'none';
        this.pendingRequestData = null;
    }

    openPolicy() { this.policyModal.classList.add('active'); }
    closePolicy() { this.policyModal.classList.remove('active'); }

    attachEventListeners() {
        document.getElementById('request-btn')?.addEventListener('click', () => this.open());
        document.getElementById('modal-close')?.addEventListener('click', () => this.close());
        document.getElementById('cancel-btn')?.addEventListener('click', () => this.close());
        
        document.getElementById('policy-close')?.addEventListener('click', () => this.closePolicy());
        document.getElementById('policy-decline')?.addEventListener('click', () => this.closePolicy());
        document.getElementById('policy-accept')?.addEventListener('click', () => this.handlePolicyAccept());

        this.form?.addEventListener('submit', (e) => this.handleSubmit(e));

        const { startTime, endTime, date, attendees, purposeSelect, purposeCustom } = this.inputs;
        
        // Purpose dropdown handler
        purposeSelect?.addEventListener('change', () => {
            const customGroup = document.getElementById('custom-purpose-group');
            if (purposeSelect.value === 'other') {
                customGroup.style.display = 'block';
                purposeCustom.required = true;
            } else {
                customGroup.style.display = 'none';
                purposeCustom.required = false;
                purposeCustom.value = '';
            }
            this.updateVenueSuggestion();
        });
        
        purposeCustom?.addEventListener('input', () => this.updateVenueSuggestion());
        
        // Utilities field handler - update pricing when utilities are requested
        this.inputs.notes?.addEventListener('input', () => {
            const start = this.inputs.startTime.value;
            const end = this.inputs.endTime.value;
            if (start && end && start < end) {
                const duration = parseInt(end.split(':')[0]) - parseInt(start.split(':')[0]);
                this.updatePricingSummary(duration);
            }
        });
        
        [startTime, endTime].forEach(el => {
            el?.addEventListener('change', () => this.updateDurationInfo());
        });

        date?.addEventListener('change', () => {
            this.updateAvailableTimes();
            this.checkTimeConflict();
        });

        attendees?.addEventListener('input', () => this.updateVenueSuggestion());
    }

    updateDurationInfo() {
        const start = this.inputs.startTime.value;
        const end = this.inputs.endTime.value;

        if (start && end && start < end) {
            const duration = parseInt(end.split(':')[0]) - parseInt(start.split(':')[0]);
            this.durationInfo.innerHTML = `<strong>Estimated Duration:</strong> ${duration} hour${duration > 1 ? 's' : ''}`;
            this.durationInfo.style.display = 'block';
            
            // Calculate and display pricing
            this.updatePricingSummary(duration);
        } else {
            this.durationInfo.style.display = 'none';
            document.getElementById('pricing-summary').style.display = 'none';
        }
        this.checkTimeConflict();
    }

    updatePricingSummary(duration) {
        const currentRoom = state.selectedRoom;
        const isStaff = state.user?.isStaff || false;
        
        // Check if utilities are requested
        const utilitiesRequested = this.inputs.notes?.value.trim().length > 0;
        
        // Staff members get free reservations
        const pricePerHour = isStaff ? 0 : (currentRoom.pricePerHour || 0);
        const facilityTotal = pricePerHour * duration;
        const utilityFee = (duration >= 8 && !isStaff) ? 800 : 0;
        const utilitiesRequestedFee = (utilitiesRequested && !isStaff) ? 800 : 0;
        const totalAmount = facilityTotal + utilityFee + utilitiesRequestedFee;

        // Update display
        if (isStaff) {
            document.getElementById('price-facility-rate').textContent = 'FREE (Staff)';
        } else {
            document.getElementById('price-facility-rate').textContent = `₱${pricePerHour.toLocaleString()}/hr`;
        }
        
        document.getElementById('price-duration').textContent = `${duration} hour${duration > 1 ? 's' : ''}`;
        document.getElementById('price-total').textContent = isStaff ? 'FREE' : `₱${totalAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        
        // Show/hide utility fee row (8+ hours)
        const utilityRow = document.getElementById('utility-fee-row');
        if (utilityFee > 0) {
            utilityRow.style.display = 'flex';
        } else {
            utilityRow.style.display = 'none';
        }
        
        // Show/hide utilities requested fee row
        const utilitiesRequestedRow = document.getElementById('utilities-requested-fee-row');
        if (utilitiesRequestedFee > 0) {
            utilitiesRequestedRow.style.display = 'flex';
        } else {
            utilitiesRequestedRow.style.display = 'none';
        }

        // Show pricing summary
        document.getElementById('pricing-summary').style.display = 'block';
    }

    checkTimeConflict() {
        const { date, startTime, endTime } = this.inputs;
        if (!date.value || !startTime.value || !endTime.value || startTime.value >= endTime.value) {
            this.conflictWarning.style.display = 'none';
            return;
        }

        const conflict = findConflict(state.selectedRoom.id, date.value, startTime.value, endTime.value);
        if (conflict) {
            const isBlocked = conflict.status === 'blocked';
            this.conflictWarning.innerHTML = isBlocked 
                ? `<strong style="color:#ef4444;">⚠️ Facility Unavailable</strong><br>The administrator has marked this facility as unavailable for the selected time.`
                : `<strong style="color:#ef4444;">⚠️ Timing Conflict</strong><br>The selected slot overlaps with an existing reservation.`;
            this.conflictWarning.style.display = 'block';
        } else {
            this.conflictWarning.style.display = 'none';
        }
    }

    async handleSubmit(e) {
        e.preventDefault();
        
        // Get purpose from dropdown or custom input
        const purposeValue = this.inputs.purposeSelect.value === 'other' 
            ? this.inputs.purposeCustom.value 
            : this.inputs.purposeSelect.value;
        
        const formData = {
            name: this.inputs.name.value,
            email: this.inputs.email.value,
            contact: this.inputs.contact.value,
            date: this.inputs.date.value,
            startTime: this.inputs.startTime.value,
            endTime: this.inputs.endTime.value,
            attendees: parseInt(this.inputs.attendees.value),
            purpose: purposeValue,
            additionalNotes: this.inputs.notes.value
        };

        if (isPastDate(new Date(formData.date))) return showToast('Cannot book for past dates.', 'error');
        if (formData.startTime >= formData.endTime) return showToast('Invalid time range.', 'error');
        
        const conflict = findConflict(state.selectedRoom.id, formData.date, formData.startTime, formData.endTime);
        if (conflict) {
            return showToast(conflict.status === 'blocked' ? 'Facility is unavailable.' : 'Selected time is already taken.', 'error');
        }

        // Calculate total amount (free for staff)
        const isStaff = state.user?.isStaff || false;
        const duration = parseInt(formData.endTime.split(':')[0]) - parseInt(formData.startTime.split(':')[0]);
        const pricePerHour = isStaff ? 0 : (state.selectedRoom.pricePerHour || 0);
        const facilityTotal = pricePerHour * duration;
        const utilityFee = (duration >= 8 && !isStaff) ? 800 : 0;
        const utilitiesRequestedFee = (formData.additionalNotes.trim().length > 0 && !isStaff) ? 800 : 0;
        const totalAmount = facilityTotal + utilityFee + utilitiesRequestedFee;

        this.pendingRequestData = {
            id: Date.now().toString(),
            roomId: state.selectedRoom.id,
            roomName: state.selectedRoom.name,
            totalAmount: totalAmount,
            paymentStatus: isStaff ? 'paid' : 'pending',
            ...formData,
            status: 'pending',
            submittedAt: new Date().toISOString()
        };
        this.openPolicy();
    }

    async handlePolicyAccept() {
        if (!this.pendingRequestData) return;
        const success = await savereservationRequest(this.pendingRequestData);
        if (success) {
            showToast('Request submitted successfully!', 'success');
            this.closePolicy();
            this.close();
            location.reload(); 
        } else {
            showToast('Submission failed. The time may have been blocked or taken.', 'error');
        }
    }
}