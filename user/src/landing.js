
/**
 * Landing Page Script
 * Loads and displays events
 */

async function loadEvents() {
    try {
        const response = await fetch('/data/events.json');
        const data = await response.json();
        
        if (data.events) {
            renderEvents(data.events);
        }
    } catch (error) {
        console.error('Error loading events:', error);
    }
}

function renderEvents(events) {
    const upcomingContainer = document.getElementById('upcoming-events-grid');
    const pastContainer = document.getElementById('past-events-grid');
    
    if (!upcomingContainer || !pastContainer) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcoming = events.filter(event => new Date(event.date) >= today);
    const past = events.filter(event => new Date(event.date) < today);

    // Render upcoming events
    upcomingContainer.innerHTML = upcoming.length > 0
        ? upcoming.map(event => createEventCard(event)).join('')
        : '<p class="empty-message">No upcoming events</p>';

    // Render past events
    pastContainer.innerHTML = past.length > 0
        ? past.map(event => createEventCard(event, true)).join('')
        : '<p class="empty-message">No past events</p>';
}

function createEventCard(event, isPast = false) {
    const date = new Date(event.date);
    const formattedDate = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });

    return `
        <div class="event-card ${isPast ? 'past-event' : ''}" style="background-image: url('${event.image || ''}')">
            <div class="event-card-overlay">
                <h3 class="event-title">${event.title}</h3>
                <p class="event-date">${formattedDate}</p>
                <p class="event-location">${event.location}</p>
                ${event.description ? `<p class="event-description">${event.description}</p>` : ''}
            </div>
        </div>
    `;
}

// Load events when page loads
document.addEventListener('DOMContentLoaded', loadEvents);
