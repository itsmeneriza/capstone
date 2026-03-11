/**
 * Data Service
 * Loads and manages all application data
 */

export class DataService {
    constructor() {
        this.rooms = [];
        this.reservations = [];
        this.events = [];
        this.forecast = null;
        
        // High-quality imagery for BCHS facilities preview
        this.facilityImages = {
            'auditorium': 'https://i.ytimg.com/vi/1UKKL5Jn5fA/hq720.jpg?sqp=-oaymwEhCK4FEIIDSFryq4qpAxMIARUAAAAAGAElAADIQj0AgKJD&rs=AOn4CLCJ398kH9DrijR2dIQzOR9RcOfT6A',
            'library': 'https://m0chilici0us.wordpress.com/wp-content/uploads/2018/11/facility_map2.gif?w=620',
            'grounds': 'https://cdn2.picryl.com/photo/2018/11/26/baguio-city-high-school-gov-pack-road-baguio-benguet2018-11-26-487a2b-1024.jpg',
            'avr': 'https://scontent.fmnl13-4.fna.fbcdn.net/v/t39.30808-6/487498150_1124489526356338_5411853051129380862_n.jpg?_nc_cat=109&ccb=1-7&_nc_sid=833d8c&_nc_eui2=AeFgKON3D_rL16XBn2_EVzzpQisjz7N8yiZCKyPPs3zKJnyAp26MSYQ61hjiPubqBzb-vnW4xIrUXLwU9azjzF1O&_nc_ohc=1O5m35JXY7EQ7kNvwH-fnkv&_nc_oc=AdmRdVyHQCGFO5iPEbygzCfEi0XRcsyQG4npJQiCdAvB5LFmBnSOoGOBis7WrmSIZeeuAOkzkehuUUMDXxQyUc0a&_nc_zt=23&_nc_ht=scontent.fmnl13-4.fna&_nc_gid=vAoxZ2Db4MNxi96Wpo5T3A&oh=00_AfvIt04bDMxhkJsHAfk26zOcNR8yXdvoWzWhdQ47FzTQJA&oe=698B55FB',
            'gym': 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTOi8hdNFCrebXJu89W3P5Xnwmm5OttsVrs5Q&s'
        };
    }

    async loadAllData() {
        try {
            await Promise.all([
                this.loadRooms(),
                this.loadreservations(),
                this.loadEvents(),
                this.loadForecast()
            ]);
            return true;
        } catch (error) {
            console.error('Error loading data:', error);
            return false;
        }
    }

    async loadRooms() {
        try {
            const response = await fetch('/data/rooms.json');
            const data = await response.json();
            this.rooms = data.rooms;
        } catch (e) {
            console.error('Failed to load rooms.json', e);
            // Fallback rooms
            this.rooms = [
                { id: 'auditorium', name: 'Auditorium', capacity: 1000 },
                { id: 'library', name: 'Library', capacity: 100 },
                { id: 'grounds', name: 'Grounds', capacity: 1800 },
                { id: 'avr', name: 'AVR', capacity: 150 },
                { id: 'gym', name: 'Gym', capacity: 2000 }
            ];
        }
    }

    async loadreservations() {
        // 1. Load static reservations from file (legacy/backup)
        let filereservations = [];
        try {
            const response = await fetch('/data/reservations.json');
            const data = await response.json();
            filereservations = (data.reservations || []).map(b => ({ ...b, status: 'approved' }));
        } catch (e) {
            console.warn('Could not load reservations.json, using empty list');
        }
        
        // 2. Load ALL relevant entries from Shared LocalStorage (Approved, Pending, and BLOCKED)
        const localRequests = this.getRequestsFromStorage();
        
        // 3. Merge
        const allreservations = [...filereservations];
        
        // Add local entries if they aren't already in the file data
        localRequests.forEach(entry => {
            if (!allreservations.find(b => b.id === entry.id)) {
                allreservations.push(entry);
            }
        });
        
        this.reservations = allreservations;
        console.log(`📅 Loaded ${this.reservations.length} schedules (including Admin Blocks)`);
    }
    
    /**
     * Get ALL requests from localStorage 'requests' (except rejected/refused)
     */
    getRequestsFromStorage() {
        try {
            const requests = JSON.parse(localStorage.getItem('requests') || '[]');
            
            // Keep approved, pending, and BLOCKED entries
            const active = requests.filter(req => req.status !== 'rejected' && req.status !== 'refused');

            return active.map(req => ({
                id: req.id,
                roomId: req.roomId || this.getRoomIdFromName(req.roomName || req.room),
                date: req.date,
                startTime: req.startTime,
                endTime: req.endTime,
                purpose: req.purpose,
                attendees: req.attendees,
                name: req.name,
                email: req.email,
                contact: req.contact || req.phone,
                status: req.status || 'pending'
            }));
        } catch (error) {
            console.error('Error loading requests from localStorage:', error);
            return [];
        }
    }
    
    /**
     * Convert room name to room ID
     */
    getRoomIdFromName(roomName) {
        const nameMap = {
            'Auditorium': 'auditorium',
            'Library': 'library',
            'Grounds': 'grounds',
            'AVR': 'avr',
            'Gym': 'gym'
        };
        return nameMap[roomName] || roomName?.toLowerCase() || 'auditorium';
    }

    async loadEvents() {
        try {
            const response = await fetch('/data/events.json');
            const data = await response.json();
            this.events = data.events || [];
        } catch (e) {
            this.events = [];
        }
    }

    async loadForecast() {
        try {
            const response = await fetch('/data/forecast.json');
            const data = await response.json();
            this.forecast = data.forecast;
        } catch (e) {
            this.forecast = null;
        }
    }

    getRooms() {
        return this.rooms;
    }

    getreservations() {
        return this.reservations;
    }

    getEvents() {
        return this.events;
    }

    getForecast() {
        return this.forecast;
    }

    getFacilityImage(roomId) {
        return this.facilityImages[roomId] || 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=1200&auto=format&fit=crop';
    }

    getreservationsForRoom(roomId) {
        return this.reservations.filter(b => b.roomId === roomId);
    }

    getreservationsForDate(roomId, dateStr) {
        return this.reservations.filter(
            b => b.roomId === roomId && b.date === dateStr
        );
    }

    async savereservation(reservation) {
        // Actual saving happens in requestService (to 'requests' list)
        return true;
    }
}

// Export singleton instance
export const dataService = new DataService();