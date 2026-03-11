/**
 * Local Data Manager
 * Manages reservation requests using browser's localStorage
 * Provides export/import functionality for syncing with JSON files
 */

export interface reservationRequest {
  id: string;
  roomId: string;
  roomName: string;
  name: string;
  contact: string;
  email: string;
  date: string;
  startTime: string;
  endTime: string;
  attendees: number;
  purpose: string;
  appointmentDate: string;
  appointmentTime: string;
  status: 'pending' | 'approved' | 'rejected';
  paymentStatus: 'pending' | 'paid' | 'unpaid';
  additionalNotes: string;
  submittedAt: string;
}

const STORAGE_KEY = 'bchs_reservation_requests';

/**
 * Get all reservation requests from localStorage
 */
export function getAllRequests(): reservationRequest[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error reading requests from localStorage:', error);
    return [];
  }
}

/**
 * Add a new reservation request to localStorage
 */
export function addRequest(request: reservationRequest): void {
  try {
    const requests = getAllRequests();
    requests.push(request);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
    console.log('✅ Request saved:', request.id);
  } catch (error) {
    console.error('Error saving request:', error);
    throw error;
  }
}

/**
 * Update an existing reservation request
 */
export function updateRequest(id: string, updates: Partial<reservationRequest>): void {
  try {
    const requests = getAllRequests();
    const index = requests.findIndex(r => r.id === id);
    if (index !== -1) {
      requests[index] = { ...requests[index], ...updates };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
      console.log('✅ Request updated:', id);
    }
  } catch (error) {
    console.error('Error updating request:', error);
    throw error;
  }
}

/**
 * Delete a reservation request
 */
export function deleteRequest(id: string): void {
  try {
    const requests = getAllRequests();
    const filtered = requests.filter(r => r.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    console.log('✅ Request deleted:', id);
  } catch (error) {
    console.error('Error deleting request:', error);
    throw error;
  }
}

/**
 * Clear all reservation requests
 */
export function clearAllRequests(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    console.log('✅ All requests cleared');
  } catch (error) {
    console.error('Error clearing requests:', error);
    throw error;
  }
}

/**
 * Export requests to JSON format (for downloading)
 */
export function exportRequestsToJSON(): string {
  const requests = getAllRequests();
  return JSON.stringify({ requests }, null, 2);
}

/**
 * Import requests from JSON data
 */
export function importRequestsFromJSON(jsonData: string): void {
  try {
    const data = JSON.parse(jsonData);
    const requests = data.requests || data;
    
    if (!Array.isArray(requests)) {
      throw new Error('Invalid JSON format. Expected an array of requests.');
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
    console.log(`✅ Imported ${requests.length} requests`);
  } catch (error) {
    console.error('Error importing requests:', error);
    throw error;
  }
}

/**
 * Download requests as JSON file
 */
export function downloadRequestsJSON(): void {
  const json = exportRequestsToJSON();
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `bchs_requests_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  console.log('✅ Requests downloaded as JSON file');
}

/**
 * Get requests count by status
 */
export function getRequestStats(): {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
} {
  const requests = getAllRequests();
  return {
    total: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    approved: requests.filter(r => r.status === 'approved').length,
    rejected: requests.filter(r => r.status === 'rejected').length,
  };
}

/**
 * Get requests for a specific date
 */
export function getRequestsByDate(date: string): reservationRequest[] {
  const requests = getAllRequests();
  return requests.filter(r => r.date === date);
}

/**
 * Get requests for a specific room
 */
export function getRequestsByRoom(roomId: string): reservationRequest[] {
  const requests = getAllRequests();
  return requests.filter(r => r.roomId === roomId);
}

/**
 * Sync localStorage data with a JSON file structure
 * This creates a properly formatted JSON that matches /data/requests.json
 */
export function generateRequestsJSONStructure(): object {
  const requests = getAllRequests();
  return {
    requests: requests
  };
}
