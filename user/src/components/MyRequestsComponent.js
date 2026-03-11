/**
 * My Requests Component
 * Displays all reservation requests made by the logged-in user
 */

import { state } from '../core/state.js';
import { convertTo12Hour } from '../utils/dateUtils.js';

export class MyRequests {
    constructor() {
        this.container = document.getElementById('my-requests-container');
        this.setupCancellationModal();
    }

    setupCancellationModal() {
        // Create modal if it doesn't exist
        if (!document.getElementById('cancellation-modal')) {
            const modal = document.createElement('div');
            modal.id = 'cancellation-modal';
            modal.style.cssText = 'display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; align-items: center; justify-content: center;';
            modal.innerHTML = `
                <div style="background: white; border-radius: 1rem; padding: 2rem; max-width: 500px; width: 90%; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);">
                    <h3 style="font-size: 1.5rem; font-weight: 700; color: #1e293b; margin-bottom: 1rem;">Request Cancellation</h3>
                    <p style="font-size: 0.875rem; color: #64748b; margin-bottom: 1.5rem;">Please provide a reason for cancelling this reservation request. Your cancellation will be reviewed within 2 business days.</p>
                    
                    <div style="margin-bottom: 1.5rem;">
                        <label style="display: block; font-size: 0.875rem; font-weight: 600; color: #374151; margin-bottom: 0.5rem;">Cancellation Reason *</label>
                        <textarea 
                            id="cancellation-reason-input" 
                            rows="4" 
                            placeholder="Please explain why you need to cancel this request..."
                            style="width: 100%; padding: 0.75rem; border: 2px solid #e2e8f0; border-radius: 0.5rem; font-size: 0.875rem; resize: vertical; font-family: inherit;"
                            required
                        ></textarea>
                    </div>

                    <div style="display: flex; gap: 0.75rem; justify-content: flex-end;">
                        <button 
                            onclick="window.closeCancellationModal()" 
                            style="background: #f1f5f9; color: #475569; border: none; padding: 0.75rem 1.5rem; border-radius: 0.5rem; font-weight: 600; cursor: pointer; transition: all 0.2s;"
                            onmouseover="this.style.background='#e2e8f0'" 
                            onmouseout="this.style.background='#f1f5f9'">
                            Cancel
                        </button>
                        <button 
                            onclick="window.submitCancellation()" 
                            style="background: #ef4444; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 0.5rem; font-weight: 600; cursor: pointer; transition: all 0.2s;"
                            onmouseover="this.style.background='#dc2626'" 
                            onmouseout="this.style.background='#ef4444'">
                            Submit Cancellation
                        </button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }

        // Setup global functions
        window.requestCancellation = (requestId) => {
            this.currentCancellationId = requestId;
            const modal = document.getElementById('cancellation-modal');
            const input = document.getElementById('cancellation-reason-input');
            input.value = '';
            modal.style.display = 'flex';
        };

        window.closeCancellationModal = () => {
            const modal = document.getElementById('cancellation-modal');
            modal.style.display = 'none';
            this.currentCancellationId = null;
        };

        window.submitCancellation = () => {
            const reason = document.getElementById('cancellation-reason-input').value.trim();
            
            if (!reason) {
                alert('Please provide a reason for cancellation.');
                return;
            }

            if (this.currentCancellationId) {
                this.processCancellation(this.currentCancellationId, reason);
            }
        };
    }

    processCancellation(requestId, reason) {
        try {
            const allRequests = JSON.parse(localStorage.getItem('requests') || '[]');
            const requestIndex = allRequests.findIndex(req => req.id === requestId);
            
            if (requestIndex !== -1) {
                allRequests[requestIndex].status = 'cancelled';
                allRequests[requestIndex].cancellationReason = reason;
                allRequests[requestIndex].cancellationRequestedAt = new Date().toISOString();
                
                localStorage.setItem('requests', JSON.stringify(allRequests));
                
                // Close modal
                window.closeCancellationModal();
                
                // Show notification
                import('./NotificationComponent.js').then(({ showToast }) => {
                    showToast('Cancellation request submitted successfully. Please wait 2 business days for a reply.', 'success');
                });
                
                // Re-render the component
                this.render();
            }
        } catch (error) {
            console.error('Error processing cancellation:', error);
            alert('Failed to process cancellation. Please try again.');
        }
    }

    render() {
        if (!this.container) return;

        // Check if user is logged in
        if (!state.isLoggedIn || !state.user) {
            this.container.innerHTML = `
                <div style="text-align: center; padding: 3rem; color: #64748b;">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin: 0 auto 1rem;">
                        <path d="M9 11l3 3L22 4"></path>
                        <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"></path>
                    </svg>
                    <p style="font-size: 1.125rem; font-weight: 600; margin-bottom: 0.5rem;">Please log in to view your requests</p>
                    <p style="font-size: 0.875rem;">Click the Login button in the top-right corner to access your reservation history.</p>
                </div>
            `;
            return;
        }

        // Get user's requests from localStorage
        const allRequests = JSON.parse(localStorage.getItem('requests') || '[]');
        
        // Filter requests by user's contact number or email
        const userRequests = allRequests.filter(req => {
            if (state.user.phone && req.contact === state.user.phone) return true;
            if (state.user.email && req.email === state.user.email) return true;
            return false;
        });

        // Sort by date (newest first)
        userRequests.sort((a, b) => {
            const dateCompare = b.date.localeCompare(a.date);
            if (dateCompare !== 0) return dateCompare;
            return b.submittedAt?.localeCompare(a.submittedAt || '') || 0;
        });

        if (userRequests.length === 0) {
            this.container.innerHTML = `
                <div style="text-align: center; padding: 3rem; color: #64748b;">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin: 0 auto 1rem;">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="16" y1="2" x2="16" y2="6"></line>
                        <line x1="8" y1="2" x2="8" y2="6"></line>
                        <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                    <p style="font-size: 1.125rem; font-weight: 600; margin-bottom: 0.5rem;">No requests found</p>
                    <p style="font-size: 0.875rem;">You haven't made any reservation requests yet.</p>
                </div>
            `;
            return;
        }

        // Render requests
        this.container.innerHTML = `
            <div style="margin-bottom: 1.5rem;">
                <h2 style="font-size: 1.5rem; font-weight: 700; color: #1e293b; margin-bottom: 0.5rem;">My Reservation Requests</h2>
                <p style="font-size: 0.875rem; color: #64748b;">Total: ${userRequests.length} request${userRequests.length > 1 ? 's' : ''}</p>
            </div>

            <div style="display: flex; flex-direction: column; gap: 1rem;">
                ${userRequests.map(req => this.renderRequestCard(req)).join('')}
            </div>
        `;
    }

    renderRequestCard(req) {
        const statusConfig = {
            'pending': { color: '#fbbf24', bg: '#fef3c7', text: '#92400e', label: 'Pending Review', icon: '⏳' },
            'approved': { color: '#800020', bg: '#fff5f7', text: '#660019', label: 'Approved', icon: '✓' },
            'rejected': { color: '#ef4444', bg: '#fee2e2', text: '#991b1b', label: 'Rejected', icon: '✗' },
            'refused': { color: '#6b7280', bg: '#f3f4f6', text: '#374151', label: 'Cancelled', icon: '🚫' },
            'cancelled': { color: '#f59e0b', bg: '#fef3c7', text: '#92400e', label: 'Cancellation Pending', icon: '🚫' }
        };

        const status = statusConfig[req.status] || statusConfig['pending'];
        const isPast = new Date(req.date) < new Date();
        const hasAppointment = req.appointmentDate && req.appointmentTime;
        const canCancel = (req.status === 'pending' || req.status === 'approved') && !isPast && !req.cancellationReason;

        return `
            <div style="background: white; border: 2px solid #e2e8f0; border-radius: 0.75rem; padding: 1.25rem; transition: all 0.2s;">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
                    <div style="flex: 1;">
                        <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem; flex-wrap: wrap;">
                            <h3 style="font-size: 1.125rem; font-weight: 700; color: #1e293b; margin: 0;">${req.roomName || 'Facility'}</h3>
                            <span style="background: ${status.bg}; color: ${status.text}; padding: 0.25rem 0.75rem; border-radius: 0.5rem; font-size: 0.75rem; font-weight: 600; border: 1px solid ${status.color};">
                                ${status.icon} ${status.label}
                            </span>
                            ${isPast ? '<span style="background: #f3f4f6; color: #6b7280; padding: 0.25rem 0.75rem; border-radius: 0.5rem; font-size: 0.75rem; font-weight: 600;">Past Event</span>' : ''}
                        </div>
                        <p style="font-size: 0.875rem; color: #64748b; margin: 0;">${req.purpose}</p>
                    </div>
                    ${canCancel ? `
                    <button 
                        onclick="window.requestCancellation('${req.id}')" 
                        style="background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; padding: 0.5rem 1rem; border-radius: 0.5rem; font-size: 0.75rem; font-weight: 600; cursor: pointer; transition: all 0.2s; white-space: nowrap;"
                        onmouseover="this.style.background='#fecaca'" 
                        onmouseout="this.style.background='#fee2e2'">
                        🚫 Request Cancellation
                    </button>
                    ` : ''}
                </div>

                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; padding: 1rem; background: #f8fafc; border-radius: 0.5rem; margin-bottom: 1rem;">
                    <div>
                        <div style="font-size: 0.75rem; color: #64748b; margin-bottom: 0.25rem; font-weight: 600; text-transform: uppercase;">Event Date</div>
                        <div style="font-size: 0.9rem; color: #1e293b; font-weight: 600;">📅 ${req.date}</div>
                    </div>
                    <div>
                        <div style="font-size: 0.75rem; color: #64748b; margin-bottom: 0.25rem; font-weight: 600; text-transform: uppercase;">Time</div>
                        <div style="font-size: 0.9rem; color: #1e293b; font-weight: 600;">⏰ ${convertTo12Hour(req.startTime)} - ${convertTo12Hour(req.endTime)}</div>
                    </div>
                    <div>
                        <div style="font-size: 0.75rem; color: #64748b; margin-bottom: 0.25rem; font-weight: 600; text-transform: uppercase;">Attendees</div>
                        <div style="font-size: 0.9rem; color: #1e293b; font-weight: 600;">👥 ${req.attendees} pax</div>
                    </div>
                    ${req.totalAmount ? `
                    <div>
                        <div style="font-size: 0.75rem; color: #64748b; margin-bottom: 0.25rem; font-weight: 600; text-transform: uppercase;">Total Amount</div>
                        <div style="font-size: 0.9rem; color: #800020; font-weight: 700;">💰 ₱${parseFloat(req.totalAmount).toLocaleString('en-PH', {minimumFractionDigits: 2})}</div>
                    </div>
                    ` : ''}
                </div>

                ${hasAppointment ? `
                <div style="background: #fff5f7; border: 2px solid #800020; border-radius: 0.5rem; padding: 1rem; margin-bottom: 1rem;">
                    <div style="font-size: 0.75rem; color: #660019; margin-bottom: 0.5rem; font-weight: 700; text-transform: uppercase;">📍 Confirmation Visit Scheduled</div>
                    <div style="display: flex; gap: 1.5rem; flex-wrap: wrap;">
                        <div>
                            <span style="color: #64748b; font-size: 0.875rem;">Date:</span>
                            <span style="color: #1e293b; font-weight: 600; margin-left: 0.5rem;">${req.appointmentDate}</span>
                        </div>
                        <div>
                            <span style="color: #64748b; font-size: 0.875rem;">Time:</span>
                            <span style="color: #1e293b; font-weight: 600; margin-left: 0.5rem;">${req.appointmentTime}</span>
                        </div>
                    </div>
                </div>
                ` : ''}

                ${req.additionalNotes ? `
                <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #e2e8f0;">
                    <div style="font-size: 0.75rem; color: #64748b; margin-bottom: 0.5rem; font-weight: 600;">Utilities Needed:</div>
                    <div style="font-size: 0.875rem; color: #475569;">${req.additionalNotes}</div>
                </div>
                ` : ''}

                ${req.rejectionReason ? `
                <div style="background: #fee2e2; border: 1px solid #fecaca; border-radius: 0.5rem; padding: 1rem; margin-top: 1rem;">
                    <div style="font-size: 0.75rem; color: #991b1b; margin-bottom: 0.5rem; font-weight: 700;">Rejection Reason:</div>
                    <div style="font-size: 0.875rem; color: #7f1d1d;">${req.rejectionReason}</div>
                </div>
                ` : ''}

                ${req.cancellationReason ? `
                <div style="background: ${req.status === 'refused' ? '#f3f4f6' : '#fef3c7'}; border: 2px solid ${req.status === 'refused' ? '#d1d5db' : '#fbbf24'}; border-radius: 0.5rem; padding: 1rem; margin-top: 1rem;">
                    <div style="font-size: 0.75rem; color: ${req.status === 'refused' ? '#374151' : '#92400e'}; margin-bottom: 0.5rem; font-weight: 700;">
                        ${req.status === 'refused' ? '✓ Cancellation Accepted' : '🚫 Cancellation Request Submitted'}
                    </div>
                    ${req.status === 'refused' ? `
                    <div style="font-size: 0.875rem; color: #166534; margin-bottom: 0.75rem; font-weight: 600;">
                        Your cancellation request has been approved. This reservation has been cancelled.
                    </div>
                    ` : `
                    <div style="font-size: 0.875rem; color: #78350f; margin-bottom: 0.75rem; font-weight: 600;">
                        Please wait 2 business days for a reply regarding your cancellation request.
                    </div>
                    `}
                    <div style="font-size: 0.75rem; color: ${req.status === 'refused' ? '#374151' : '#92400e'}; margin-bottom: 0.25rem; font-weight: 600;">Reason:</div>
                    <div style="font-size: 0.875rem; color: ${req.status === 'refused' ? '#4b5563' : '#78350f'};">${req.cancellationReason}</div>
                    ${req.cancellationRequestedAt ? `
                    <div style="font-size: 0.75rem; color: ${req.status === 'refused' ? '#6b7280' : '#92400e'}; margin-top: 0.75rem;">
                        Requested: ${new Date(req.cancellationRequestedAt).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}
                    </div>
                    ` : ''}
                    ${req.cancellationApprovedAt ? `
                    <div style="font-size: 0.75rem; color: #166534; margin-top: 0.5rem; font-weight: 600;">
                        Approved: ${new Date(req.cancellationApprovedAt).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}
                    </div>
                    ` : ''}
                </div>
                ` : ''}

                <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #e2e8f0; font-size: 0.75rem; color: #94a3b8;">
                    Submitted: ${req.submittedAt ? new Date(req.submittedAt).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' }) : 'N/A'}
                </div>
            </div>
        `;
    }
}
