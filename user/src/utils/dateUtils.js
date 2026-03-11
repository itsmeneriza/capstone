
/**
 * Date and Time Utilities
 */

export function convertTo12Hour(time24) {
    if (!time24) return '';
    const [hour] = time24.split(':');
    let hour12 = parseInt(hour);
    const period = hour12 >= 12 ? 'PM' : 'AM';
    
    if (hour12 === 0) {
        hour12 = 12;
    } else if (hour12 > 12) {
        hour12 -= 12;
    }
    
    return `${hour12}:00 ${period}`;
}

export function formatTimeSlot(slot) {
    const [start, end] = slot.split('-');
    return `${convertTo12Hour(start)} - ${convertTo12Hour(end)}`;
}

export function formatDate(date) {
    return date.toLocaleDateString('en-US', { 
        month: 'long', 
        day: 'numeric', 
        year: 'numeric' 
    });
}

export function getMonthYear(month, year) {
    const date = new Date(year, month);
    return date.toLocaleDateString('en-US', { 
        month: 'long', 
        year: 'numeric' 
    });
}

export function getDaysInMonth(month, year) {
    return new Date(year, month + 1, 0).getDate();
}

export function getFirstDayOfMonth(month, year) {
    return new Date(year, month, 1).getDay();
}

export function isToday(day, month, year) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(year, month, day);
    checkDate.setHours(0, 0, 0, 0);
    return checkDate.getTime() === today.getTime();
}

export function isSameDate(date1, date2) {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
}

export function isPastDate(date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    return checkDate < today;
}

/**
 * Returns local date string in YYYY-MM-DD format without UTC shift
 */
export function getLocalISODate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}
