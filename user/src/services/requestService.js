/**
 * Request Service - Vanilla JS
 * Handles saving reservation requests to Shared LocalStorage
 */

export class RequestService {
    constructor() {
        // The main key shared between User App and Admin App
        this.SHARED_STORAGE_KEY = 'requests';
    }

    /**
     * Save a new reservation request
     */
    async saveRequest(request) {
        const newRequest = {
            ...request,
            id: this.generateId(),
            status: 'pending',
            submittedAt: new Date().toISOString()
        };

        // Save to Shared LocalStorage
        this.saveToSharedStorage(newRequest);

        return newRequest;
    }

    /**
     * Get all requests from shared storage
     */
    getAllRequests() {
        try {
            const stored = localStorage.getItem(this.SHARED_STORAGE_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Error reading requests:', error);
            return [];
        }
    }

    /**
     * Get requests by status
     */
    getRequestsByStatus(status) {
        return this.getAllRequests().filter(req => req.status === status);
    }

    /**
     * Export requests to JSON
     */
    exportToJSON() {
        const requests = this.getAllRequests();
        return JSON.stringify({ requests }, null, 2);
    }

    // Private methods

    saveToSharedStorage(request) {
        try {
            const requests = this.getAllRequests();
            requests.push(request);
            localStorage.setItem(this.SHARED_STORAGE_KEY, JSON.stringify(requests));
            
            console.log('✅ Request saved to Shared LocalStorage:', request.id);
            console.log('📋 Status:', request.status);
        } catch (error) {
            console.error('❌ Error saving to localStorage:', error);
        }
    }

    generateId() {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

// Export singleton instance
export const requestService = new RequestService();