/**
 * Admin Dashboard Application
 */

let requests = [];
let rooms = [];
let currentCalendarDate = new Date();
let selectedRequestToEdit = null;
let currentModalMode = 'FULL_EDIT'; // FULL_EDIT, PAYMENT_ONLY, VIEW_ONLY

const LOCAL_STORAGE_KEY = 'requests'; 

document.addEventListener('DOMContentLoaded', async () => {
    setupTabs();
    setupModals();
    setupFilters();
    setupCalendarControls();
    
    await loadData();
    setInterval(loadData, 30000);
});

async function loadData() {
    try {
        await Promise.all([loadRooms(), loadRequests()]);
        renderAll();
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

async function loadRooms() {
    try {
        const response = await fetch('../data/rooms.json');
        if (response.ok) {
            const data = await response.json();
            rooms = data.rooms || [];
        }
    } catch (e) {
        rooms = [
            { id: 'auditorium', name: 'Auditorium', capacity: 1000 },
            { id: 'library', name: 'Library', capacity: 100 },
            { id: 'grounds', name: 'Grounds', capacity: 1800 },
            { id: 'avr', name: 'AVR', capacity: 150 },
            { id: 'gym', name: 'Gym', capacity: 2000 }
        ];
    }
    // Update the room selections
    populateRoomSelects();
}

async function loadRequests() {
    const stored = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
    let staticreservations = [];
    try {
        const res = await fetch('../data/reservations.json');
        if (res.ok) {
            const data = await res.json();
            staticreservations = (data.reservations || []).map(b => ({ ...b, status: 'approved' }));
        }
    } catch (e) {}

    const combined = [...stored];
    staticreservations.forEach(s => {
        if (!combined.find(c => c.id === s.id)) combined.push(s);
    });
    
    requests = combined;
}

function setupTabs() {
    document.querySelectorAll('.tab-trigger').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab-trigger').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(`${tab.dataset.tab}-tab`)?.classList.add('active');
        });
    });
}

function setupFilters() {
    ['roomFilter', 'searchFilter'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', renderAll);
    });
}

function setupCalendarControls() {
    document.getElementById('prevMonth').onclick = () => { 
        currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1); 
        renderCalendar(); 
    };
    document.getElementById('nextMonth').onclick = () => { 
        currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1); 
        renderCalendar(); 
    };
}

function setupModals() {
    document.getElementById('closeEditModal').onclick = () => document.getElementById('editModal').classList.remove('active');
    document.getElementById('cancelEdit').onclick = () => document.getElementById('editModal').classList.remove('active');
    document.getElementById('saveEdit').onclick = savereservationChanges;
    
    document.getElementById('confirmQuickBlockBtn').onclick = confirmQuickBlock;

    // Manual Reservation Handlers
    document.getElementById('openAddReservationBtn').onclick = openAddReservationModal;
    document.getElementById('saveManualReservationBtn').onclick = saveManualReservation;

    // Event Handlers
    document.getElementById('openAddEventBtn').onclick = openAddEventModal;
    document.getElementById('saveEventBtn').onclick = saveNewEvent;
}

/**
 * UTILITY: POPULATE ALL ROOM DROPDOWNS
 */
function populateRoomSelects() {
    const selects = ['manualRoom', 'editRoomId'];
    selects.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.innerHTML = rooms.map(r => `<option value="${r.id}">${r.name}</option>`).join('');
        }
    });
}

/**
 * MANUAL RESERVATION LOGIC
 */
function openAddReservationModal() {
    const modal = document.getElementById('addReservationModal');
    // Set default date to today
    document.getElementById('manualDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('manualStartTime').value = '08:00';
    document.getElementById('manualEndTime').value = '10:00';
    modal.classList.add('active');
}

window.closeAddReservationModal = () => {
    document.getElementById('addReservationModal').classList.remove('active');
}

async function saveManualReservation() {
    const name = document.getElementById('manualName').value.trim();
    const roomId = document.getElementById('manualRoom').value;
    const roomName = getRoomName(roomId);
    const date = document.getElementById('manualDate').value;
    const startTime = document.getElementById('manualStartTime').value;
    const endTime = document.getElementById('manualEndTime').value;
    const purpose = document.getElementById('manualPurpose').value.trim();
    const attendees = parseInt(document.getElementById('manualAttendees').value) || 0;
    const paymentStatus = document.getElementById('manualPaymentStatus').value;

    if (!name || !date || !startTime || !endTime) {
        alert('Please fill in all required fields (Name, Date, Times).');
        return;
    }

    if (startTime >= endTime) {
        alert('Start time must be earlier than end time.');
        return;
    }

    const newEntry = {
        id: 'admin_' + Date.now(),
        roomId: roomId,
        roomName: roomName,
        name: name,
        contact: 'Admin Manual Entry',
        email: 'admin@bchs.edu',
        date: date,
        startTime: startTime,
        endTime: endTime,
        purpose: purpose || 'Administrative Event',
        attendees: attendees,
        status: 'approved',
        paymentStatus: paymentStatus,
        totalAmount: 0,
        submittedAt: new Date().toISOString()
    };

    const stored = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
    stored.push(newEntry);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stored));

    showToast('Manual reservation added successfully', 'success');
    closeAddReservationModal();
    // Clear form
    document.getElementById('manualName').value = '';
    document.getElementById('manualPurpose').value = '';
    
    await loadData();
}

/**
 * SCHOOL EVENT LOGIC
 */
function openAddEventModal() {
    const modal = document.getElementById('addEventModal');
    document.getElementById('eventDate').value = new Date().toISOString().split('T')[0];
    modal.classList.add('active');
}

window.closeAddEventModal = () => {
    document.getElementById('addEventModal').classList.remove('active');
}

async function saveNewEvent() {
    const title = document.getElementById('eventTitle').value.trim();
    const date = document.getElementById('eventDate').value;
    const time = document.getElementById('eventTime').value.trim();
    const location = document.getElementById('eventLocation').value;
    const attendees = parseInt(document.getElementById('eventAttendees').value) || 0;
    const description = document.getElementById('eventDescription').value.trim();
    const imageUrl = document.getElementById('eventImageUrl').value.trim();

    if (!title || !date || !time || !description) {
        alert('Please fill in all required fields (Title, Date, Time, Description).');
        return;
    }

    const newEvent = {
        id: Date.now().toString(),
        title,
        date,
        time,
        location,
        attendees,
        description,
        image: imageUrl || 'https://images.unsplash.com/photo-1758316727379-4c995d3ae455?w=800'
    };

    try {
        const response = await fetch('/api/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newEvent)
        });

        if (response.ok) {
            showToast('New school event posted successfully!', 'success');
            closeAddEventModal();
            // Clear form
            document.getElementById('eventTitle').value = '';
            document.getElementById('eventTime').value = '';
            document.getElementById('eventDescription').value = '';
            document.getElementById('eventImageUrl').value = '';
        } else {
            throw new Error('Failed to save event to server');
        }
    } catch (error) {
        console.error('Error saving event:', error);
        alert('Failed to save event. Make sure the server is running.');
    }
}

/**
 * DAY TOGGLE - OPEN FACILITY MANAGER
 */
async function handleDayToggle(dateStr) {
    let pendingBlockDate = dateStr;
    document.getElementById('quickBlockDateLabel').textContent = dateStr;
    document.getElementById('quickBlockReason').value = '';
    
    // Clear checkboxes
    document.querySelectorAll('input[name="roomBlock"]').forEach(cb => {
        cb.checked = false;
        cb.disabled = false;
    });

    // Detect Existing Blocks for this date
    const dayBlocks = requests.filter(r => r.status === 'blocked' && r.date === dateStr && r.isFullDayBlock === true);
    const existingSection = document.getElementById('existingBlocksList');
    const container = document.getElementById('blocksContainer');
    
    if (dayBlocks.length > 0) {
        existingSection.style.display = 'block';
        container.innerHTML = dayBlocks.map(b => `
            <div style="display:flex; justify-content:space-between; align-items:center; background:white; border:1px solid #e2e8f0; padding:8px 12px; border-radius:6px; margin-bottom:6px;">
                <div style="font-size:13px;">
                    <strong style="color:#b91c1c;">${getRoomName(b.roomId)}</strong>
                    <div style="font-size:11px; color:#64748b;">Reason: ${b.purpose.replace('ADMIN MANUAL BLOCK: ', '')}</div>
                </div>
                <button class="btn btn-outline btn-sm" onclick="quickUnblock('${b.id}', '${dateStr}')">Open Slot</button>
            </div>
        `).join('');
        
        // Disable checkboxes for rooms already blocked
        dayBlocks.forEach(b => {
            const cb = document.querySelector(`input[name="roomBlock"][value="${getRoomName(b.roomId)}"]`);
            if (cb) {
                cb.disabled = true;
                cb.checked = true;
            }
            if (b.roomId === 'global') {
                document.querySelector('input[name="roomBlock"][value="all"]').disabled = true;
                document.querySelector('input[name="roomBlock"][value="all"]').checked = true;
            }
        });
    } else {
        existingSection.style.display = 'none';
        container.innerHTML = '';
    }

    document.getElementById('quickBlockModal').classList.add('active');
}

/**
 * Confirm Block Action
 */
async function confirmQuickBlock() {
    const dateStr = document.getElementById('quickBlockDateLabel').textContent;
    const reason = document.getElementById('quickBlockReason').value.trim();
    if (!reason) {
        alert('Please provide a reason for the facility cancellation.');
        return;
    }

    const selectedRooms = Array.from(document.querySelectorAll('input[name="roomBlock"]:checked:not(:disabled)'))
        .map(cb => cb.value);

    if (selectedRooms.length === 0) {
        alert('Please select at least one facility to block.');
        return;
    }

    const stored = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
    
    selectedRooms.forEach(roomName => {
        const roomId = roomName === 'all' ? 'global' : roomName.toLowerCase();
        const blockEntry = {
            id: 'block_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            roomId: roomId,
            roomName: roomName === 'all' ? 'ALL FACILITIES' : roomName,
            name: 'ADMIN BLOCK',
            email: 'admin@bchs.edu',
            date: dateStr,
            startTime: '07:00',
            endTime: '18:00',
            purpose: `ADMIN MANUAL BLOCK: ${reason}`,
            status: 'blocked',
            isFullDayBlock: true,
            submittedAt: new Date().toISOString()
        };
        stored.push(blockEntry);
    });

    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stored));
    showToast(`Requested facilities blocked successfully`, 'error');
    closeQuickBlock();
    await loadData();
}

window.quickUnblock = async (id, dateStr) => {
    if (confirm('Re-open this facility?')) {
        const stored = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
        const updated = stored.filter(r => r.id !== id);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
        showToast('Facility re-opened', 'success');
        
        // Refresh modal and view
        await loadData();
        handleDayToggle(dateStr);
    }
};

window.closeQuickBlock = () => {
    document.getElementById('quickBlockModal').classList.remove('active');
};

/**
 * STATUS BUTTON HANDLERS
 */
window.selectPaymentStatus = (status) => {
    document.getElementById('editPaymentStatus').value = status;
    document.querySelectorAll('#paymentStatusGroup .status-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`#paymentStatusGroup [data-value="${status}"]`).classList.add('active');
};

/**
 * PAYMENT BREAKDOWN CALCULATOR
 */
function updatePaymentBreakdown() {
    const totalAmount = parseFloat(document.getElementById('editAmount').value) || 0;
    const downPaymentPaid = document.getElementById('downPaymentPaid').checked;
    const remainingBalancePaid = document.getElementById('remainingBalancePaid').checked;
    
    const downPaymentAmount = 2000;
    const remainingBalance = Math.max(0, totalAmount - downPaymentAmount);
    
    // Update labels
    document.getElementById('downPaymentLabel').textContent = downPaymentPaid ? '✓ Paid' : 'Not Paid';
    document.getElementById('downPaymentLabel').style.color = downPaymentPaid ? '#166534' : '#64748b';
    
    document.getElementById('remainingBalanceLabel').textContent = remainingBalancePaid ? '✓ Paid' : 'Not Paid';
    document.getElementById('remainingBalanceLabel').style.color = remainingBalancePaid ? '#166534' : '#64748b';
    
    // Calculate total paid
    let totalPaid = 0;
    if (downPaymentPaid) totalPaid += downPaymentAmount;
    if (remainingBalancePaid) totalPaid += remainingBalance;
    
    // Update summary
    document.getElementById('summaryTotal').textContent = `₱${totalAmount.toLocaleString('en-PH', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    document.getElementById('summaryDown').textContent = `₱${downPaymentAmount.toLocaleString('en-PH', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    document.getElementById('summaryRemaining').textContent = `₱${remainingBalance.toLocaleString('en-PH', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    document.getElementById('summaryPaid').textContent = `₱${totalPaid.toLocaleString('en-PH', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    
    // Auto-update payment status based on what's paid
    if (totalPaid === 0) {
        selectPaymentStatus('unpaid');
    } else if (totalPaid >= totalAmount) {
        selectPaymentStatus('paid');
    } else {
        selectPaymentStatus('pending');
    }
}

let pendingRejectionId = null;

window.selectReservationStatus = (status) => {
    if (currentModalMode === 'PAYMENT_ONLY' || currentModalMode === 'VIEW_ONLY') return;
    
    // If selecting rejected, open rejection reason modal
    if (status === 'rejected') {
        const r = requests.find(x => x.id === selectedRequestToEdit);
        if (!r) return;
        
        pendingRejectionId = selectedRequestToEdit;
        document.getElementById('rejectionContactInfo').textContent = `Email: ${r.email || 'N/A'} | Phone: ${r.contact || 'N/A'}`;
        document.getElementById('rejectionReasonText').value = '';
        document.getElementById('rejectionReasonModal').classList.add('active');
        return;
    }
    
    document.getElementById('editStatus').value = status;
    document.querySelectorAll('#reservationStatusGroup .status-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`#reservationStatusGroup [data-value="${status}"]`).classList.add('active');
};

window.closeRejectionModal = () => {
    document.getElementById('rejectionReasonModal').classList.remove('active');
    pendingRejectionId = null;
};

window.confirmRejection = async () => {
    const reason = document.getElementById('rejectionReasonText').value.trim();
    
    if (!reason) {
        alert('Please provide a reason for rejection.');
        return;
    }
    
    const r = requests.find(x => x.id === pendingRejectionId);
    if (!r) return;
    
    // Update status to rejected
    document.getElementById('editStatus').value = 'rejected';
    document.querySelectorAll('#reservationStatusGroup .status-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`#reservationStatusGroup [data-value="rejected"]`).classList.add('active');
    
    // Store rejection reason
    const stored = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
    const storedIdx = stored.findIndex(s => s.id === pendingRejectionId);
    
    if (storedIdx !== -1) {
        stored[storedIdx].rejectionReason = reason;
        stored[storedIdx].status = 'rejected';
    } else {
        const staticEntry = requests.find(req => req.id === pendingRejectionId);
        stored.push({ ...staticEntry, rejectionReason: reason, status: 'rejected' });
    }
    
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stored));
    
    // Send notification (simulated)
    showToast(`Rejection notification sent to ${r.email}`, 'success');
    console.log('Rejection Email/SMS Details:', {
        to: r.email,
        phone: r.contact,
        name: r.name,
        reason: reason,
        requestDetails: {
            room: getRoomName(r.roomId),
            date: r.date,
            time: `${convertTo12Hour(r.startTime)} - ${convertTo12Hour(r.endTime)}`
        }
    });
    
    closeRejectionModal();
    await loadData();
};

function renderAll() {
    renderQueue();
    renderConfirmed();
    renderUpcoming();
    renderPayments(); 
    renderCancellations();
    renderHistory();
    renderCalendar();
}

function renderQueue() {
    const body = document.getElementById('queueTableBody');
    if (!body) return;
    const pending = requests.filter(r => r.status === 'pending');
    document.getElementById('pendingCount').textContent = `${pending.length} pending`;
    
    body.innerHTML = pending.length ? pending.map(req => `
        <tr>
            <td>${formatDateSimple(req.submittedAt)}</td>
            <td><strong>${req.name}</strong></td>
            <td><span class="badge badge-secondary">${getRoomName(req.roomId)}</span></td>
            <td>${req.date}</td>
            <td><div class="truncate" title="${req.purpose}">${req.purpose}</div></td>
            <td>
                <button class="btn btn-bchs btn-sm" onclick="openEditModal('${req.id}', 'FULL_EDIT')">Manage Request</button>
            </td>
        </tr>
    `).join('') : '<tr><td colspan="6" style="text-align:center; padding:20px; color:#6b7280;">Queue is empty</td></tr>';
}

function renderConfirmed() {
    const body = document.getElementById('confirmedTableBody');
    if (!body) return;
    
    const today = new Date().toISOString().split('T')[0];
    
    // Filter requests that have a confirmation date set AND event date hasn't passed
    const confirmed = requests.filter(r => 
        r.appointmentDate && 
        r.appointmentDate.trim() !== '' && 
        r.date >= today
    );
    document.getElementById('confirmedCount').textContent = `${confirmed.length} confirmed`;
    
    body.innerHTML = confirmed.length ? confirmed.map(req => `
        <tr>
            <td><strong>${req.name}</strong></td>
            <td><span class="badge badge-secondary">${getRoomName(req.roomId)}</span></td>
            <td>${req.date}</td>
            <td><strong style="color: #800020;">${req.appointmentDate}</strong></td>
            <td><strong style="color: #800020;">${req.appointmentTime || 'Not set'}</strong></td>
            <td><div class="truncate" title="${req.purpose}">${req.purpose}</div></td>
            <td>
                <button class="btn btn-outline btn-sm" onclick="openEditModal('${req.id}', 'CONFIRMED_EDIT')">Manage</button>
            </td>
        </tr>
    `).join('') : '<tr><td colspan="7" style="text-align:center; padding:20px; color:#6b7280;">No confirmed appointments yet</td></tr>';
}

function renderUpcoming() {
    const container = document.getElementById('upcomingreservations');
    const filter = document.getElementById('searchFilter')?.value.toLowerCase() || '';
    const roomFilter = document.getElementById('roomFilter')?.value || 'all';

    const today = new Date().toISOString().split('T')[0];
    const up = requests.filter(r => {
        const isUp = (r.status === 'approved' || r.status === 'blocked') && r.date >= today;
        const matchesRoom = roomFilter === 'all' || getRoomName(r.roomId) === roomFilter;
        const matchesSearch = !filter || r.name.toLowerCase().includes(filter) || r.purpose.toLowerCase().includes(filter);
        return isUp && matchesRoom && matchesSearch;
    }).sort((a,b) => a.date.localeCompare(b.date));

    document.getElementById('upcomingCount').textContent = `${up.length} entries`;
    
    container.innerHTML = up.length ? up.map(b => {
        const isBlock = b.status === 'blocked';
        return `
            <div class="reservation-card ${isBlock ? 'timeslot-admin-blocked' : ''}">
                <div class="reservation-header">
                    <h3>${isBlock ? 'UNAVAILABLE' : b.name}</h3>
                    <span class="badge badge-secondary">${getRoomName(b.roomId)}</span>
                </div>
                <div class="reservation-details">
                    <div>📅 ${b.date}</div>
                    <div>⏰ ${convertTo12Hour(b.startTime)} - ${convertTo12Hour(b.endTime)}</div>
                    <div style="font-size: 12px; margin-top: 4px; color: ${isBlock ? '#991b1b' : '#64748b'};">${b.purpose}</div>
                </div>
                <button class="btn btn-outline btn-sm" style="width:100%; margin-top:12px;" onclick="openEditModal('${b.id}', 'FULL_EDIT')">Manage</button>
            </div>
        `;
    }).join('') : '<div class="empty-state"><p>No upcoming entries found</p></div>';
}

/**
 * INTERACTIVE PAYMENT MANAGEMENT
 */
function renderPayments() {
    const body = document.getElementById('paidTableBody');
    if (!body) return;

    const approved = requests.filter(r => r.status === 'approved');
    
    // Calculate Summary Stats
    let totalPaid = 0;
    let totalPending = 0;
    
    approved.forEach(b => {
        const amt = parseFloat(b.totalAmount) || 0;
        if (b.paymentStatus === 'paid') totalPaid += amt;
        else totalPending += amt;
    });

    const collectionRate = (totalPaid + totalPending) > 0 ? Math.round((totalPaid / (totalPaid + totalPending)) * 100) : 0;

    document.getElementById('totalCollectedValue').textContent = `₱${totalPaid.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
    document.getElementById('totalPendingValue').textContent = `₱${totalPending.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
    document.getElementById('collectionRateValue').textContent = `${collectionRate}%`;

    body.innerHTML = approved.length ? approved.map(b => {
        const downPaid = b.downPaymentPaid || false;
        const remainingPaid = b.remainingBalancePaid || false;
        const totalAmount = parseFloat(b.totalAmount) || 0;
        const downPaymentAmount = 2000;
        const remainingBalance = Math.max(0, totalAmount - downPaymentAmount);
        
        return `
        <tr>
            <td><strong>${b.name}</strong></td>
            <td><span class="badge badge-secondary">${getRoomName(b.roomId)}</span></td>
            <td>${b.date}</td>
            <td>
                <input type="number" 
                       class="inline-amount-input" 
                       value="${b.totalAmount || 0}" 
                       onchange="updateInlinePayment('${b.id}', this.value)"
                       step="0.01" min="0">
            </td>
            <td>
                <div style="display: flex; gap: 6px; margin-bottom: 6px;">
                    <button class="btn btn-sm ${downPaid ? 'btn-success' : 'btn-outline'}" 
                            onclick="toggleDownPayment('${b.id}', ${!downPaid})"
                            style="flex: 1; font-size: 11px; padding: 6px 8px; ${downPaid ? 'background: #22c55e; color: white; border-color: #22c55e;' : ''}">
                        ${downPaid ? '✓' : '✗'} Down (₱2k)
                    </button>
                    <button class="btn btn-sm ${remainingPaid ? 'btn-success' : 'btn-outline'}" 
                            onclick="toggleRemainingBalance('${b.id}', ${!remainingPaid})"
                            style="flex: 1; font-size: 11px; padding: 6px 8px; ${remainingPaid ? 'background: #22c55e; color: white; border-color: #22c55e;' : ''}">
                        ${remainingPaid ? '✓' : '✗'} Balance (₱${remainingBalance.toLocaleString('en-PH', {minimumFractionDigits: 0, maximumFractionDigits: 0})})
                    </button>
                </div>
            </td>
            <td>
                <span class="badge badge-interactive ${getPaymentBadgeClass(b.paymentStatus)}" 
                      onclick="cyclePaymentStatus('${b.id}', '${b.paymentStatus}')">
                    ${(b.paymentStatus || 'pending').toUpperCase()}
                </span>
            </td>
            <td>
                <button class="btn btn-outline btn-sm" onclick="openEditModal('${b.id}', 'VIEW_ONLY')" style="font-size: 11px; padding: 4px 8px; width: 100%;">
                    👁️ View Details
                </button>
            </td>
        </tr>
    `;
    }).join('') : '<tr><td colspan="7" style="text-align:center; padding:30px; color:#6b7280;">No approved reservations found</td></tr>';
}

function getPaymentBadgeClass(status) {
    if (status === 'paid') return 'badge-paid';
    if (status === 'unpaid') return 'badge-unpaid';
    return 'badge-pending';
}

/**
 * Cycle Payment Status: Pending -> Paid -> Unpaid -> Pending
 */
window.cyclePaymentStatus = async (id, currentStatus) => {
    const statusMap = {
        'pending': 'paid',
        'paid': 'unpaid',
        'unpaid': 'pending'
    };
    const nextStatus = statusMap[currentStatus] || 'pending';
    
    const stored = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
    const idx = stored.findIndex(s => s.id === id);
    if (idx !== -1) {
        stored[idx].paymentStatus = nextStatus;
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stored));
        await loadData();
        showToast(`Payment marked as ${nextStatus}`, 'success');
    }
};

/**
 * Toggle Down Payment (₱2,000)
 */
window.toggleDownPayment = async (id, newState) => {
    const stored = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
    const idx = stored.findIndex(s => s.id === id);
    
    if (idx !== -1) {
        stored[idx].downPaymentPaid = newState;
        
        // Auto-update payment status
        const downPaid = newState;
        const remainingPaid = stored[idx].remainingBalancePaid || false;
        const totalAmount = parseFloat(stored[idx].totalAmount) || 0;
        
        if (!downPaid && !remainingPaid) {
            stored[idx].paymentStatus = 'unpaid';
        } else if (downPaid && remainingPaid) {
            stored[idx].paymentStatus = 'paid';
        } else {
            stored[idx].paymentStatus = 'pending';
        }
        
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stored));
        await loadData();
        showToast(newState ? 'Down payment marked as paid' : 'Down payment marked as unpaid', 'success');
    }
};

/**
 * Toggle Remaining Balance
 */
window.toggleRemainingBalance = async (id, newState) => {
    const stored = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
    const idx = stored.findIndex(s => s.id === id);
    
    if (idx !== -1) {
        stored[idx].remainingBalancePaid = newState;
        
        // Auto-update payment status
        const downPaid = stored[idx].downPaymentPaid || false;
        const remainingPaid = newState;
        
        if (!downPaid && !remainingPaid) {
            stored[idx].paymentStatus = 'unpaid';
        } else if (downPaid && remainingPaid) {
            stored[idx].paymentStatus = 'paid';
        } else {
            stored[idx].paymentStatus = 'pending';
        }
        
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stored));
        await loadData();
        showToast(newState ? 'Remaining balance marked as paid' : 'Remaining balance marked as unpaid', 'success');
    }
};

window.updateInlinePayment = async (id, amount) => {
    const stored = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
    const idx = stored.findIndex(s => s.id === id);
    if (idx !== -1) {
        stored[idx].totalAmount = parseFloat(amount) || 0;
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stored));
        await loadData();
        showToast('Amount updated', 'success');
    }
};

function renderCancellations() {
    const body = document.getElementById('cancellationsTableBody');
    if (!body) return;
    
    // Filter requests with cancellation reasons (status is 'cancelled')
    const cancellations = requests.filter(r => r.status === 'cancelled' && r.cancellationReason);
    
    document.getElementById('cancellationsCount').textContent = `${cancellations.length} requests`;
    
    body.innerHTML = cancellations.length ? cancellations.map(req => `
        <tr>
            <td>${req.cancellationRequestedAt ? formatDateSimple(req.cancellationRequestedAt) : 'N/A'}</td>
            <td><strong>${req.name}</strong></td>
            <td><span class="badge badge-secondary">${getRoomName(req.roomId)}</span></td>
            <td>${req.date}</td>
            <td>
                <div class="truncate" title="${req.cancellationReason}" style="max-width: 300px;">
                    ${req.cancellationReason}
                </div>
            </td>
            <td>
                <div style="display: flex; gap: 8px;">
                    <button class="btn btn-bchs btn-sm" onclick="acceptCancellation('${req.id}')">Accept</button>
                    <button class="btn btn-outline btn-sm" onclick="openEditModal('${req.id}', 'VIEW_ONLY')">View Details</button>
                </div>
            </td>
        </tr>
    `).join('') : '<tr><td colspan="6" style="text-align:center; padding:20px; color:#6b7280;">No cancellation requests</td></tr>';
}

window.acceptCancellation = async (id) => {
    if (!confirm('Accept this cancellation request? The reservation will be permanently cancelled.')) {
        return;
    }
    
    try {
        const stored = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
        const idx = stored.findIndex(s => s.id === id);
        
        if (idx !== -1) {
            // Change status from 'cancelled' to 'refused' to mark as processed
            stored[idx].status = 'refused';
            stored[idx].cancellationApprovedAt = new Date().toISOString();
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stored));
            
            showToast('Cancellation accepted successfully', 'success');
            await loadData();
        }
    } catch (error) {
        console.error('Error accepting cancellation:', error);
        alert('Failed to process cancellation. Please try again.');
    }
};

function renderHistory() {
    const today = new Date().toISOString().split('T')[0];
    
    // Include rejected, refused, AND approved/blocked events that have passed
    const history = requests.filter(r => {
        const isPastEvent = (r.status === 'approved' || r.status === 'blocked') && r.date < today;
        const isCancelled = r.status === 'rejected' || r.status === 'refused';
        return isPastEvent || isCancelled;
    }).sort((a, b) => b.date.localeCompare(a.date)); // Sort by date descending (most recent first)
    
    document.getElementById('historyCount').textContent = `${history.length} records`;
    
    document.getElementById('historyTableBody').innerHTML = history.length ? history.map(req => {
        let statusBadge = '';
        let statusText = '';
        
        if (req.status === 'rejected' || req.status === 'refused') {
            statusBadge = 'badge-destructive';
            statusText = 'Cancelled';
        } else if (req.status === 'approved') {
            statusBadge = 'badge-secondary';
            statusText = 'Completed';
        } else if (req.status === 'blocked') {
            statusBadge = 'badge-secondary';
            statusText = 'Past Block';
        }
        
        return `
            <tr>
                <td>${req.date}</td>
                <td>${req.name}</td>
                <td>${getRoomName(req.roomId)}</td>
                <td><span class="badge ${statusBadge}">${statusText}</span></td>
                <td><button class="btn btn-outline btn-sm" onclick="openEditModal('${req.id}', 'VIEW_ONLY')">View</button></td>
            </tr>
        `;
    }).join('') : '<tr><td colspan="5" style="text-align:center; padding:20px; color:#6b7280;">No history records</td></tr>';
}

function renderCalendar() {
    const el = document.getElementById('calendar');
    const my = document.getElementById('currentMonthYear');
    if (!el) return;
    
    const year = currentCalendarDate.getFullYear(), month = currentCalendarDate.getMonth();
    my.textContent = new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    
    const first = new Date(year, month, 1).getDay(), days = new Date(year, month + 1, 0).getDate();
    const active = requests.filter(r => r.status === 'approved' || r.status === 'blocked');
    const currentRoomFilter = document.getElementById('roomFilter').value;
    const currentRoomId = currentRoomFilter === 'all' ? 'global' : currentRoomFilter.toLowerCase();

    let html = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => `<div class="calendar-header-cell">${d}</div>`).join('');
    for (let i = 0; i < first; i++) html += `<div class="calendar-day empty"></div>`;
    for (let d = 1; d <= days; d++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const dayEntries = active.filter(b => b.date === dateStr);
        
        const isManuallyBlocked = dayEntries.some(e => 
            e.status === 'blocked' && (e.roomId === currentRoomId || e.roomId === 'global') && e.isFullDayBlock === true
        );
        
        const hasOtherEntries = dayEntries.some(e => 
            e.status === 'approved' || (e.status === 'blocked' && !e.isFullDayBlock)
        );
        
        html += `
            <div class="calendar-day ${hasOtherEntries ? 'has-reservations' : ''} ${isManuallyBlocked ? 'is-manually-blocked' : ''}" 
                 onclick="handleDayToggle('${dateStr}')">
                <span class="day-number">${d}</span>
                ${dayEntries.length ? `<div class="reservation-dots">${dayEntries.map(e => `<span class="dot ${e.status === 'blocked' ? 'dot-red' : ''}"></span>`).join('')}</div>` : ''}
            </div>`;
    }
    el.innerHTML = html;
}

/**
 * OPEN CONTEXT-AWARE MODAL
 * modes: FULL_EDIT, PAYMENT_ONLY, VIEW_ONLY, CONFIRMED_EDIT
 */
window.openEditModal = (id, mode = 'FULL_EDIT') => {
    const r = requests.find(x => x.id === id);
    if (!r) return;
    selectedRequestToEdit = id;
    currentModalMode = mode;
    
    // Set Modal Title based on mode
    const titleEl = document.getElementById('editModalTitle');
    if (mode === 'VIEW_ONLY') titleEl.textContent = 'View reservation Record';
    else if (mode === 'PAYMENT_ONLY') titleEl.textContent = 'Update Payment Details';
    else if (mode === 'CONFIRMED_EDIT') titleEl.textContent = 'Manage Confirmed Appointment';
    else titleEl.textContent = 'Manage reservation Entry';

    const summary = document.getElementById('edit-summary');
    summary.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
            <div>
                <div style="font-weight:800; font-size:18px; color:#1e293b;">${r.name}</div>
                <div style="color:#64748b; font-size:13px; margin-top:2px;">Contact: ${r.contact || 'N/A'} | Email: ${r.email || 'N/A'}</div>
            </div>
            <span class="badge badge-secondary">${r.status.toUpperCase()}</span>
        </div>
        <div style="margin-top:12px; font-size:14px; color:#475569; padding:10px; background:white; border-radius:6px; border:1px dashed #cbd5e1;">
            <strong style="display:block; margin-bottom:4px; font-size:11px; color:#94a3b8; text-transform:uppercase;">Original Request Purpose:</strong>
            "${r.purpose}"
        </div>
    `;

    // Field Management
    const lockFields = mode === 'PAYMENT_ONLY' || mode === 'VIEW_ONLY';
    const readOnlyAll = mode === 'VIEW_ONLY';
    const lockAppointmentFields = mode === 'CONFIRMED_EDIT';

    // Toggle disabled state for specific groups
    document.querySelectorAll('.edit-field-locked').forEach(el => {
        el.disabled = lockFields;
    });

    // Lock appointment fields in CONFIRMED_EDIT mode
    document.querySelectorAll('.edit-field-appointment').forEach(el => {
        el.disabled = lockAppointmentFields || lockFields;
    });

    document.getElementById('editAmount').disabled = readOnlyAll;
    document.getElementById('editPaymentStatus').disabled = readOnlyAll;
    
    // Save button visibility
    document.getElementById('saveEdit').style.display = readOnlyAll ? 'none' : 'block';

    // Populate Data
    document.getElementById('editRoomId').value = r.roomId;
    document.getElementById('editDate').value = r.date;
    document.getElementById('editStartTime').value = r.startTime;
    document.getElementById('editEndTime').value = r.endTime;
    document.getElementById('editAppointmentDate').value = r.appointmentDate || '';
    document.getElementById('editAppointmentTime').value = r.appointmentTime || '';
    document.getElementById('editAmount').value = r.totalAmount || 0;
    
    // Initialize Down Payment Tracking
    const downPaymentPaid = r.downPaymentPaid || false;
    const remainingBalancePaid = r.remainingBalancePaid || false;
    document.getElementById('downPaymentPaid').checked = downPaymentPaid;
    document.getElementById('remainingBalancePaid').checked = remainingBalancePaid;
    
    // Disable payment checkboxes in VIEW_ONLY mode
    document.getElementById('downPaymentPaid').disabled = readOnlyAll;
    document.getElementById('remainingBalancePaid').disabled = readOnlyAll;
    
    // Update payment breakdown display
    updatePaymentBreakdown();
    
    // Add event listeners for payment checkboxes (only if not VIEW_ONLY)
    if (!readOnlyAll) {
        document.getElementById('downPaymentPaid').onchange = updatePaymentBreakdown;
        document.getElementById('remainingBalancePaid').onchange = updatePaymentBreakdown;
        document.getElementById('editAmount').oninput = updatePaymentBreakdown;
    }
    
    // Set Payment Status Buttons
    const paymentStatus = r.paymentStatus || 'pending';
    document.getElementById('editPaymentStatus').value = paymentStatus;
    document.querySelectorAll('#paymentStatusGroup .status-btn').forEach(btn => {
        btn.classList.remove('active');
        btn.disabled = readOnlyAll;
        if (btn.disabled) btn.classList.add('disabled');
        else btn.classList.remove('disabled');
    });
    document.querySelector(`#paymentStatusGroup [data-value="${paymentStatus}"]`)?.classList.add('active');
    
    // Set Reservation Status Buttons
    const reservationStatus = r.status;
    document.getElementById('editStatus').value = reservationStatus;
    document.querySelectorAll('#reservationStatusGroup .status-btn').forEach(btn => {
        btn.classList.remove('active');
        btn.disabled = lockFields;
        if (btn.disabled) btn.classList.add('disabled');
        else btn.classList.remove('disabled');
    });
    document.querySelector(`#reservationStatusGroup [data-value="${reservationStatus}"]`)?.classList.add('active');

    document.getElementById('editModal').classList.add('active');
};

async function savereservationChanges() {
    if (currentModalMode === 'VIEW_ONLY') return;
    
    const idx = requests.findIndex(x => x.id === selectedRequestToEdit);
    if (idx === -1) return;
    
    const stored = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
    const storedIdx = stored.findIndex(s => s.id === selectedRequestToEdit);

    let update = {};

    if (currentModalMode === 'PAYMENT_ONLY') {
        // Only update financials
        update = {
            totalAmount: parseFloat(document.getElementById('editAmount').value) || 0,
            paymentStatus: document.getElementById('editPaymentStatus').value,
            downPaymentPaid: document.getElementById('downPaymentPaid').checked,
            remainingBalancePaid: document.getElementById('remainingBalancePaid').checked
        };
    } else {
        // FULL_EDIT mode or CONFIRMED_EDIT mode
        const newStatus = document.getElementById('editStatus').value;

        update = {
            roomId: document.getElementById('editRoomId').value,
            roomName: getRoomName(document.getElementById('editRoomId').value),
            date: document.getElementById('editDate').value,
            startTime: document.getElementById('editStartTime').value,
            endTime: document.getElementById('editEndTime').value,
            appointmentDate: document.getElementById('editAppointmentDate').value,
            appointmentTime: document.getElementById('editAppointmentTime').value,
            totalAmount: parseFloat(document.getElementById('editAmount').value) || 0,
            paymentStatus: document.getElementById('editPaymentStatus').value,
            downPaymentPaid: document.getElementById('downPaymentPaid').checked,
            remainingBalancePaid: document.getElementById('remainingBalancePaid').checked,
            status: newStatus
        };
    }

    // Apply Update
    if (storedIdx !== -1) {
        stored[storedIdx] = { ...stored[storedIdx], ...update };
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stored));
    } else {
        const staticEntry = requests.find(r => r.id === selectedRequestToEdit);
        stored.push({ ...staticEntry, ...update });
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stored));
    }
    
    // Check if appointment was just set
    const appointmentWasSet = update.appointmentDate && update.appointmentDate.trim() !== '';
    
    if (appointmentWasSet) {
        showToast('Confirmation appointment set! Request moved to Confirmed tab.', 'success');
        document.getElementById('editModal').classList.remove('active');
        await loadData();
        // Switch to Confirmed tab
        document.querySelectorAll('.tab-trigger').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        document.querySelector('[data-tab="confirmed"]').classList.add('active');
        document.getElementById('confirmed-tab').classList.add('active');
    } else {
        showToast('Changes saved successfully', 'success');
        document.getElementById('editModal').classList.remove('active');
        await loadData();
    }
}

function getRoomName(id) { 
    if (id === 'global') return 'ALL FACILITIES';
    const r = rooms.find(x => x.id === id); 
    return r ? r.name : id; 
}
function convertTo12Hour(t) { if(!t) return ''; let [h, m] = t.split(':'); h = parseInt(h); return `${h % 12 || 12}:${m || '00'} ${h >= 12 ? 'PM' : 'AM'}`; }
function formatDateSimple(d) { return d ? new Date(d).toLocaleDateString() : '-'; }

function showToast(m, t) {
    const el = document.createElement('div');
    el.className = `toast ${t}`;
    el.textContent = m;
    const container = document.getElementById('toastContainer');
    if(container) {
        container.appendChild(el);
        setTimeout(() => el.remove(), 3000);
    }
}
