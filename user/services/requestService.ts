/**
 * Request Service
 * Handles saving reservation requests to JSON file and localStorage
 */

export interface reservationRequest {
  id: string;
  roomId: string;
  roomName: string;
  name: string;
  contact: string;
  email?: string;
  date: string;
  startTime: string;
  endTime: string;
  attendees: number;
  purpose: string;
  appointmentDate: string;
  appointmentTime: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
}

class RequestService {
  private readonly STORAGE_KEY = 'bchs-reservation-requests';
  private readonly API_ENDPOINT = '/api/requests'; // For server integration

  /**
   * Save a new reservation request
   */
  async saveRequest(request: Omit<reservationRequest, 'id' | 'status' | 'submittedAt'>): Promise<reservationRequest> {
    const newRequest: reservationRequest = {
      ...request,
      id: this.generateId(),
      status: 'pending',
      submittedAt: new Date().toISOString()
    };

    // Save to localStorage (browser)
    this.saveToLocalStorage(newRequest);

    // Try to save to server (if available)
    await this.saveToServer(newRequest);

    return newRequest;
  }

  /**
   * Get all requests from localStorage
   */
  getAllRequests(): reservationRequest[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error reading requests:', error);
      return [];
    }
  }

  /**
   * Get requests by status
   */
  getRequestsByStatus(status: reservationRequest['status']): reservationRequest[] {
    return this.getAllRequests().filter(req => req.status === status);
  }

  /**
   * Update request status
   */
  updateRequestStatus(requestId: string, status: reservationRequest['status']): boolean {
    try {
      const requests = this.getAllRequests();
      const index = requests.findIndex(req => req.id === requestId);
      
      if (index !== -1) {
        requests[index].status = status;
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(requests));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error updating request:', error);
      return false;
    }
  }

  /**
   * Update entire request
   */
  updateRequest(requestId: string, updatedRequest: reservationRequest): boolean {
    try {
      const requests = this.getAllRequests();
      const index = requests.findIndex(req => req.id === requestId);
      
      if (index !== -1) {
        requests[index] = {
          ...updatedRequest,
          id: requestId // Ensure ID doesn't change
        };
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(requests));
        
        // Try to update on server too
        this.updateOnServer(updatedRequest);
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error updating request:', error);
      return false;
    }
  }

  /**
   * Get a single request by ID
   */
  getRequestById(requestId: string): reservationRequest | null {
    try {
      const requests = this.getAllRequests();
      return requests.find(req => req.id === requestId) || null;
    } catch (error) {
      console.error('Error getting request:', error);
      return null;
    }
  }

  /**
   * Delete a request
   */
  deleteRequest(requestId: string): boolean {
    try {
      const requests = this.getAllRequests();
      const filtered = requests.filter(req => req.id !== requestId);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered));
      return true;
    } catch (error) {
      console.error('Error deleting request:', error);
      return false;
    }
  }

  /**
   * Export requests to JSON (for downloading)
   */
  exportToJSON(): string {
    const requests = this.getAllRequests();
    return JSON.stringify({ requests }, null, 2);
  }

  /**
   * Download requests as JSON file
   */
  downloadRequestsFile(): void {
    const jsonStr = this.exportToJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `reservation-requests-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Clear all requests (admin function)
   */
  clearAllRequests(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }

  // Private helper methods

  private saveToLocalStorage(request: reservationRequest): void {
    try {
      const existing = this.getAllRequests();
      existing.push(request);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(existing));
      console.log('✅ Request saved to localStorage:', request.id);
    } catch (error) {
      console.error('❌ Error saving to localStorage:', error);
    }
  }

  private async saveToServer(request: reservationRequest): Promise<void> {
    try {
      // This will work if you set up the server
      const response = await fetch(this.API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request)
      });

      if (response.ok) {
        console.log('✅ Request saved to server:', request.id);
      } else {
        console.log('⚠️ Server not available, using localStorage only');
      }
    } catch (error) {
      // Server not available, that's okay - we have localStorage
      console.log('ℹ️ Running in offline mode (localStorage only)');
    }
  }

  private async updateOnServer(request: reservationRequest): Promise<void> {
    try {
      const response = await fetch(`${this.API_ENDPOINT}/${request.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request)
      });

      if (response.ok) {
        console.log('✅ Request updated on server:', request.id);
      }
    } catch (error) {
      console.log('ℹ️ Server update skipped (offline mode)');
    }
  }

  private generateId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const requestService = new RequestService();
