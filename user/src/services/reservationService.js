/**
 * reservation Service
 * Handles all reservation-related operations
 */

import { state } from '../core/state.js';
import { dataService } from './dataService.js';
import { requestService } from './requestService.js';
import { getLocalISODate } from '../utils/dateUtils.js';

export async function loadData() {
    try {
        const success = await dataService.loadAllData();
        
        if (success) {
            state.rooms = dataService.getRooms();
            state.reservations = dataService.getreservations();
        }
        
        return success;
    } catch (error) {
        console.error('Error loading data:', error);
        alert('Failed to load data. Please ensure data files exist.');
        return false;
    }
}

export async function savereservationRequest(request) {
    // Final check for conflicts (including admin blocks) before saving
    const conflict = findConflict(request.roomId, request.date, request.startTime, request.endTime);
    if (conflict) {
        console.error('Conflict detected during save:', conflict);
        return false;
    }

    // Save to data service (adds to reservations)
    const success = await dataService.savereservation(request);
    
    if (success) {
        // Also save to request service (captures in requests.json)
        const room = state.rooms.find(r => r.id === request.roomId);
        await requestService.saveRequest({
            ...request,
            roomName: room?.name || 'Unknown Room'
        });
    }
    
    return success;
}

/**
 * Marks a reservation request as cancelled in localStorage with a reason
 */
export async function deletereservationRequest(reservationId, reason = '') {
    try {
        const requests = JSON.parse(localStorage.getItem('requests') || '[]');
        const idx = requests.findIndex(r => r.id === reservationId);
        
        if (idx !== -1) {
            requests[idx].status = 'rejected'; // User cancellation marks as rejected/cancelled
            const cancelNote = reason ? `\n[User Cancel Reason]: ${reason}` : '\n[User Cancelled]';
            requests[idx].additionalNotes = (requests[idx].additionalNotes || '') + cancelNote;
            localStorage.setItem('requests', JSON.stringify(requests));
            
            // Reload local state
            await loadData();
            return true;
        }
        return false;
    } catch (e) {
        console.error('Failed to cancel reservation:', e);
        return false;
    }
}

/**
 * Get all active reservations for a specific date and room.
 * Includes manual 'global' blocks that close all rooms.
 */
export function getreservationsForDate(roomId, dateStr) {
    return state.reservations.filter(b => {
        // Status must be approved, pending, or blocked
        const isValidStatus = ['approved', 'accepted', 'pending', 'blocked'].includes(b.status);
        if (!isValidStatus) return false;

        const isGlobalBlock = (b.roomId === 'global' && b.status === 'blocked');
        const isDirectMatch = (b.roomId === roomId && b.date === dateStr);
        return (isGlobalBlock && b.date === dateStr) || (isDirectMatch && b.date === dateStr);
    });
}

export function getreservationById(reservationId) {
    return state.reservations.find(b => b.id === reservationId);
}

export function getreservationDensity(roomId, day, month, year) {
    const dateStr = getLocalISODate(new Date(year, month, day));
    const dayreservations = getreservationsForDate(roomId, dateStr);
    
    // If there's a global block or a full-day manual block for this room, mark as full
    if (dayreservations.some(b => b.status === 'blocked' && b.isFullDayBlock)) return 'full';
    
    if (dayreservations.length === 0) return 'none';
    
    let totalBookedHours = 0;
    dayreservations.forEach(reservation => {
        const start = parseInt(reservation.startTime.split(':')[0], 10);
        const end = parseInt(reservation.endTime.split(':')[0], 10);
        totalBookedHours += (end - start);
    });
    
    const totalAvailableHours = 11; // 7 AM - 6 PM
    const bookedPercentage = (totalBookedHours / totalAvailableHours) * 100;
    
    if (bookedPercentage >= 70) return 'full';
    if (bookedPercentage >= 40) return 'busy';
    return 'light';
}

export function isTimeSlotBooked(roomId, dateStr, slotTime) {
    const [startStr, endStr] = slotTime.split('-');
    const slotStart = parseInt(startStr.split(':')[0], 10);
    const slotEnd = parseInt(endStr.split(':')[0], 10);
    
    const reservations = getreservationsForDate(roomId, dateStr);
    
    return reservations.some(reservation => {
        // If the whole day is blocked, every slot is booked
        if (reservation.status === 'blocked' && reservation.isFullDayBlock) return true;

        const reservationStart = parseInt(reservation.startTime.split(':')[0], 10);
        const reservationEnd = parseInt(reservation.endTime.split(':')[0], 10);
        // Overlap Check
        return (slotStart < reservationEnd && slotEnd > reservationStart);
    });
}

export function getAvailableSlots(roomId, dateStr) {
    const allSlots = [
        '07:00-08:00', '08:00-09:00', '09:00-10:00', '10:00-11:00',
        '11:00-12:00', '12:00-13:00', '13:00-14:00', '14:00-15:00',
        '15:00-16:00', '16:00-17:00', '17:00-18:00'
    ];
    
    return allSlots.filter(
        slot => !isTimeSlotBooked(roomId, dateStr, slot)
    );
}

export function getBookedSlots(roomId, dateStr) {
    const allSlots = [
        '07:00-08:00', '08:00-09:00', '09:00-10:00', '10:00-11:00',
        '11:00-12:00', '12:00-13:00', '13:00-14:00', '14:00-15:00',
        '15:00-16:00', '16:00-17:00', '17:00-18:00'
    ];
    
    return allSlots.filter(
        slot => isTimeSlotBooked(roomId, dateStr, slot)
    );
}

export function findConflict(roomId, date, startTime, endTime) {
    const relevant = getreservationsForDate(roomId, date);
    return relevant.find(reservation => {
        // Full day blocks conflict with everything
        if (reservation.status === 'blocked' && reservation.isFullDayBlock) return true;
        
        return reservation.startTime < endTime &&
               reservation.endTime > startTime;
    });
}