/**
 * Chat Component
 * AI assistant chatbox with enhanced logic for capacity, availability, and procedures.
 */

import { state, addChatMessage, setChatLoading } from '../core/state.js';
import { getLocalISODate } from '../utils/dateUtils.js';
import { getreservationsForDate } from '../services/reservationService.js';

export class Chat {
    constructor() {
        this.container = document.getElementById('chat-messages');
        this.input = document.getElementById('chat-input');
        this.sendBtn = document.getElementById('chat-send');
    }

    init() {
        if (state.chatMessages.length === 0) {
            this.addMessage('assistant', "Hello! I'm your <strong>BCHS Reservation Assistant</strong>.<br><br>I can help you with:<br>• Pricing & payment information<br>• Room capacities and recommendations<br>• Checking availability<br>• Reservation procedures<br>• Cancellation & refund policies<br>• Facility details and features<br><br>What would you like to know?");
        }
        this.render();
        this.attachEventListeners();
    }

    render() {
        if (!this.container) return;
        this.container.innerHTML = state.chatMessages.map(msg => `
            <div class="message ${msg.sender}">
                <div class="message-bubble">${msg.text}</div>
            </div>
        `).join('');

        if (state.isChatLoading) {
            const typing = document.createElement('div');
            typing.className = 'message assistant';
            typing.innerHTML = `<div class="message-bubble" style="display:flex; align-items:center; gap:8px;"><div class="spinner-small"></div>Assistant is thinking...</div>`;
            this.container.appendChild(typing);
        }
        this.container.scrollTop = this.container.scrollHeight;
    }

    addMessage(sender, text) {
        addChatMessage({ sender, text });
        this.render();
    }

    async sendMessage() {
        const text = this.input.value.trim();
        if (!text) return;

        this.addMessage('user', text);
        this.input.value = '';
        setChatLoading(true);
        this.render();

        // Simulate AI processing delay
        setTimeout(() => {
            const response = this.getSmartResponse(text);
            this.addMessage('assistant', response);
            setChatLoading(false);
            this.render();
        }, 600);
    }

    getSmartResponse(query) {
        const q = query.toLowerCase();
        
        // 1. Greeting responses
        if (q.match(/^(hi|hello|hey|good morning|good afternoon|good evening|greetings)$/)) {
            return "Hello! I'm here to help you with BCHS reservation facility. You can ask me about room capacities, availability, reservation procedures, or upcoming events. What would you like to know?";
        }

        // 2. Thank you responses
        if (q.includes('thank') || q.includes('thanks')) {
            return "You're welcome! Feel free to ask if you need anything else. Happy to help!";
        }

        // 3. reservation Procedure - Enhanced
        if (q.includes('how') && (q.includes('book') || q.includes('reserve') || q.includes('request'))) {
            return "<strong>Reservation Process:</strong><br><br>1. <strong>Select a Room</strong> - Choose from the sidebar (Auditorium, Gym, Library, etc.)<br>2. <strong>Pick a Date</strong> - Click on an available date (green = available, yellow = partially booked, red = full)<br>3. <strong>Request Reservation</strong> - Click the 'Request Reservation' button<br>4. <strong>Fill the Form</strong> - Provide your details, event purpose, and time slots<br>5. <strong>Accept Policy</strong> - Review and accept facility usage terms<br>6. <strong>Visit Admin Office</strong> - Complete payment at least 3 working days before your event<br><br><strong>Important:</strong> Unpaid reservations may be cancelled if priority school events arise!";
        }

        // 4. General procedure/steps
        if (q.includes('step') || q.includes('procedure') || q.includes('process')) {
            return "I can explain:<br>• <strong>Reservation steps</strong> - How to reserve a facility<br>• <strong>Payment process</strong> - When and where to pay<br>• <strong>Cancellation procedure</strong> - How to cancel a reservation<br><br>Which one would you like to know about?";
        }

        // 5. Pax Limits - Enhanced with recommendations
        if (q.includes('capacity') || q.includes('pax') || q.includes('people') || q.includes('limit') || q.includes('fit') || q.includes('size') || q.includes('accommodate')) {
            let roomInfo = "<strong>Facility Capacities:</strong><br><br>";
            
            // Sort rooms by capacity
            const sortedRooms = [...state.rooms].sort((a, b) => b.capacity - a.capacity);
            sortedRooms.forEach(room => {
                roomInfo += `<strong>${room.name}</strong>: ${room.capacity.toLocaleString()} pax<br>`;
            });
            
            // Add recommendations based on query
            if (q.match(/\d+/)) {
                const requestedPax = parseInt(q.match(/\d+/)[0]);
                const suitable = sortedRooms.filter(r => r.capacity >= requestedPax);
                if (suitable.length > 0) {
                    roomInfo += `<br>For ${requestedPax} people, I recommend: <strong>${suitable[suitable.length - 1].name}</strong>`;
                }
            }
            
            return roomInfo + "<br><br>Need help choosing the right venue for your event?";
        }

        // 6. Availability Check - Enhanced with specific date support
        if (q.includes('available') || q.includes('free') || q.includes('vacant') || q.includes('open') || q.includes('full') || q.includes('busy')) {
            const selectedRoomName = state.selectedRoom ? state.selectedRoom.name : "a room";
            const todayStr = getLocalISODate(new Date());
            
            let availabilityMsg = `<strong>Checking Availability for ${selectedRoomName}</strong><br><br>`;
            availabilityMsg += "<strong>Calendar Color Guide:</strong><br>";
            availabilityMsg += "<strong>Green</strong> - Highly available (0-30% booked)<br>";
            availabilityMsg += "<strong>Yellow</strong> - Partially booked (30-70%)<br>";
            availabilityMsg += "<strong>Red</strong> - Fully booked or blocked<br><br>";
            
            if (state.selectedRoom) {
                const reservationsToday = getreservationsForDate(state.selectedRoom.id, todayStr);
                
                if (reservationsToday.length === 0) {
                    availabilityMsg += `<strong>Good news!</strong> ${selectedRoomName} has no reservations today (${todayStr}).`;
                } else {
                    availabilityMsg += `${selectedRoomName} has <strong>${reservationsToday.length} reservation(s)</strong> today:<br>`;
                    reservationsToday.slice(0, 3).forEach(reservation => {
                        availabilityMsg += `• ${reservation.startTime} - ${reservation.endTime}: ${reservation.purpose}<br>`;
                    });
                    if (reservationsToday.length > 3) {
                        availabilityMsg += `<em>...and ${reservationsToday.length - 3} more</em><br>`;
                    }
                }
            } else {
                availabilityMsg += "<strong>Tip:</strong> Select a room from the sidebar to see detailed availability!";
            }
            
            return availabilityMsg;
        }

        // 7. Payment - Enhanced with pricing ranges and breakdown
        if (q.includes('pay') || q.includes('price') || q.includes('cost') || q.includes('money') || q.includes('fee') || q.includes('charge') || q.includes('rate') || q.includes('how much')) {
            let priceInfo = "<strong>Facility Pricing & Payment Information:</strong><br><br>";
            
            priceInfo += "<strong>Hourly Rates:</strong><br>";
            priceInfo += "<strong>Auditorium:</strong> ₱1,800/hour<br>";
            priceInfo += "<strong>Library:</strong> ₱1,000/hour<br>";
            priceInfo += "<strong>Gym:</strong> ₱1,000/hour<br>";
            priceInfo += "<strong>Grounds:</strong> ₱700/hour<br>";
            priceInfo += "<strong>AVR:</strong> ₱500/hour<br><br>";
            
            priceInfo += "<strong>Additional Fees:</strong><br>";
            priceInfo += "• <strong>Utility Fee:</strong> ₱800 (for reservations 8+ hours)<br><br>";
            
            priceInfo += "<strong>Payment Breakdown:</strong><br>";
            priceInfo += "1. <strong>Down Payment:</strong> ₱2,000 (non-refundable)<br>";
            priceInfo += "   • Required to secure your reservation<br>";
            priceInfo += "   • Pay within 3 working days of approval<br><br>";
            
            priceInfo += "2. <strong>Final Payment:</strong> Remaining balance<br>";
            priceInfo += "   • Must be paid at least <strong>3 working days before event</strong><br>";
            priceInfo += "   • Visit Administration Office during office hours<br><br>";
            
            priceInfo += "<strong>Important Notes:</strong><br>";
            priceInfo += "• Unpaid reservations risk cancellation for priority events<br>";
            priceInfo += "• Down payment is non-refundable<br>";
            priceInfo += "• Staff members receive FREE reservations<br><br>";
            
            priceInfo += "<strong>Payment Location:</strong> Administration Office (Mon-Fri, 8AM-5PM)";
            
            return priceInfo;
        }

        // 8. Cancellation - Enhanced with refund policy
        if (q.includes('cancel') || q.includes('remove') || q.includes('delete') || q.includes('refund')) {
            return "<strong>Cancellation Process:</strong><br><br>1. Find your reservation in the 'Daily Schedule' on the right sidebar<br>2. Click on your reservation entry<br>3. A verification code will be sent to your registered email<br>4. Enter the 6-digit code to verify<br>5. Provide a cancellation reason<br>6. Confirm cancellation<br><br><strong>Cancellation Policy:</strong><br>• Cancellations NOT accepted within 2 weeks of event<br>• Down payment (₱2,000) is non-refundable<br>• Suggest 2 weeks notice for proper rescheduling<br><br><strong>Tip:</strong> Cancel as early as possible to allow others to book the slot!";
        }
        
        // Budget and cost estimation
        if (q.includes('budget') || q.includes('estimate') || q.includes('calculate') || q.includes('total cost') || q.includes('how much for')) {
            return "<strong>Budget Planning Guide:</strong><br><br><strong>Quick Price Comparison:</strong><br>• <strong>Most Affordable:</strong> AVR (₱500/hr)<br>• <strong>Budget-Friendly:</strong> Grounds (₱700/hr)<br>• <strong>Mid-Range:</strong> Library & Gym (₱1,000/hr)<br>• <strong>Premium:</strong> Auditorium (₱1,800/hr)<br><br><strong>Cost Formula:</strong><br>Total = (Hourly Rate × Hours) + Utility Fee (if 8+ hrs)<br><br><strong>Example Budgets:</strong><br>• <strong>Half-day (4hrs):</strong> ₱2,000 - ₱7,200<br>• <strong>Full-day (8hrs):</strong> ₱4,800 - ₱15,200<br><br><strong>Don't forget:</strong> ₱2,000 down payment required!<br><br>Need a specific calculation? Tell me your hours and facility!";
        }
        
        // Cheapest/most expensive queries
        if (q.includes('cheap') || q.includes('affordable') || q.includes('lowest') || q.includes('least expensive')) {
            return "<strong>Most Affordable Options:</strong><br><br>1. <strong>AVR:</strong> ₱500/hour (Best value!)<br>   • Perfect for: Presentations, workshops, small events<br>   • Capacity: 150 pax<br><br>2. <strong>Grounds:</strong> ₱700/hour<br>   • Perfect for: Outdoor activities, team building<br>   • Capacity: 180 pax<br>   • Note: Closed on weekends<br><br><strong>Budget Tip:</strong> Book for less than 8 hours to avoid the ₱800 utility fee!";
        }
        
        if (q.includes('expensive') || q.includes('costly') || q.includes('highest') || q.includes('most expensive')) {
            return "<strong>Premium Facilities:</strong><br><br>1. <strong>Auditorium:</strong> ₱1,800/hour (Top-tier)<br>   • Capacity: 1,000 pax<br>   • Features: Stage, professional sound system<br>   • Best for: Major events, graduations<br><br>2. <strong>Library & Gym:</strong> ₱1,000/hour<br>   • Library: 100 pax (Academic focus)<br>   • Gym: 2,000 pax (Largest capacity)<br><br>The higher price reflects premium amenities and larger capacity!";
        }
        
        // Down payment specific
        if (q.includes('down payment') || q.includes('deposit') || q.includes('2000') || q.includes('2,000')) {
            return "<strong>Down Payment Details:</strong><br><br><strong>Amount:</strong> ₱2,000.00 (fixed)<br><br><strong>Purpose:</strong><br>• Secures your reservation<br>• Shows commitment to the booking<br>• Covers administrative processing<br><br><strong>When to Pay:</strong><br>• Within 3 working days of approval<br>• At Administration Office<br><br><strong>Important:</strong><br>• Non-refundable under all circumstances<br>• Required for ALL reservations (except staff)<br>• Deducted from total amount<br><br><strong>Payment Location:</strong> Admin Office (Mon-Fri, 8AM-5PM)";
        }

        // 9. Specific Room Information - Enhanced with pricing
        if (q.includes('auditorium')) {
            return "<strong>Auditorium</strong><br><br><strong>Capacity:</strong> 1,000 pax<br><strong>Rate:</strong> ₱1,800/hour<br><strong>Best For:</strong> Seminars, graduations, performances, large assemblies<br><strong>Features:</strong> Stage, sound system, projector, air conditioning<br><strong>Rules:</strong> No food or drinks allowed inside<br><br><strong>Example Cost:</strong><br>• 4 hours = ₱7,200<br>• 8 hours = ₱14,400 + ₱800 utility = ₱15,200<br><br>Perfect for your big events!";
        }
        if (q.includes('gym')) {
            return "<strong>Gymnasium</strong><br><br><strong>Capacity:</strong> 2,000 pax (our largest!)<br><strong>Rate:</strong> ₱1,000/hour<br><strong>Best For:</strong> Sports events, tournaments, large assemblies, exhibitions<br><strong>Features:</strong> Basketball court, high ceilings, bleachers, ample floor space<br><br><strong>Example Cost:</strong><br>• 4 hours = ₱4,000<br>• 8 hours = ₱8,000 + ₱800 utility = ₱8,800<br><br>Ideal for athletic and large-scale events!";
        }
        if (q.includes('library')) {
            return "<strong>Library</strong><br><br><strong>Capacity:</strong> 100 pax<br><strong>Rate:</strong> ₱1,000/hour<br><strong>Best For:</strong> Study groups, research sessions, quiet meetings, academic workshops<br><strong>Features:</strong> Study tables, research materials, quiet environment, air conditioning<br><strong>Rules:</strong> Maintain silence, no food or drinks<br><br><strong>Example Cost:</strong><br>• 3 hours = ₱3,000<br>• 6 hours = ₱6,000<br><br>Perfect for focused academic activities!";
        }
        if (q.includes('grounds') || q.includes('outdoor')) {
            return "<strong>School Grounds</strong><br><br><strong>Capacity:</strong> 180 pax<br><strong>Rate:</strong> ₱700/hour<br><strong>Best For:</strong> Outdoor activities, sports practice, team building, picnics<br><strong>Features:</strong> Open space, fresh air, natural lighting<br><strong>Important:</strong> Closed on weekends (Saturday & Sunday)<br><br><strong>Example Cost:</strong><br>• 4 hours = ₱2,800<br>• 8 hours = ₱5,600 + ₱800 utility = ₱6,400<br><br>Great for outdoor events and activities!";
        }
        if (q.includes('avr') || q.includes('audio') || q.includes('visual')) {
            return "<strong>Audio-Visual Room (AVR)</strong><br><br><strong>Capacity:</strong> 150 pax<br><strong>Rate:</strong> ₱500/hour (Most affordable!)<br><strong>Best For:</strong> Film screenings, presentations, media workshops, training sessions<br><strong>Features:</strong> Projector, sound system, comfortable seating, air conditioning<br><br><strong>Example Cost:</strong><br>• 4 hours = ₱2,000<br>• 8 hours = ₱4,000 + ₱800 utility = ₱4,800<br><br>Perfect for multimedia presentations!";
        }

        // 10. Comparison questions
        if ((q.includes('which') || q.includes('what') || q.includes('recommend')) && (q.includes('room') || q.includes('venue') || q.includes('facility'))) {
            return "<strong>Choosing the Right Venue:</strong><br><br>Tell me about your event:<br>• How many people? (e.g., '50 people')<br>• What type of event? (e.g., 'seminar', 'sports', 'meeting')<br>• Indoor or outdoor?<br><br>I'll recommend the perfect facility for you!";
        }

        // 11. Event type recommendations
        if (q.includes('seminar') || q.includes('conference') || q.includes('presentation')) {
            return "For seminars/conferences, I recommend:<br>• <strong>50-150 people:</strong> AVR (Audio-Visual Room)<br>• <strong>150-1000 people:</strong> Auditorium<br>• <strong>1000+ people:</strong> Gymnasium<br><br>All equipped with projectors and sound systems!";
        }
        if (q.includes('sport') || q.includes('basketball') || q.includes('volleyball') || q.includes('game')) {
            return "For sports activities:<br>• <strong>Indoor sports:</strong> Gymnasium (2,000 pax) - basketball, volleyball, badminton<br>• <strong>Outdoor activities:</strong> School Grounds (180 pax) - but closed on weekends<br><br>Book early for popular dates!";
        }
        if (q.includes('study') || q.includes('research') || q.includes('academic')) {
            return "For academic activities:<br>• <strong>Small groups (up to 100):</strong> Library - quiet, focused environment<br>• <strong>Workshops/Training:</strong> AVR - multimedia capabilities<br><br>The Library is perfect for concentrated study sessions!";
        }

        // 12. Weekend/Schedule questions
        if (q.includes('weekend') || q.includes('saturday') || q.includes('sunday')) {
            return "<strong>Weekend Availability:</strong><br><br>Most facilities are available on weekends, <strong>except</strong>:<br><strong>School Grounds</strong> - Closed on Saturdays and Sundays<br><br>Auditorium, Gym, Library, and AVR are open on weekends!";
        }

        // 13. Rules and policies
        if (q.includes('rule') || q.includes('policy') || q.includes('regulation') || q.includes('allowed') || q.includes('prohibited')) {
            return "<strong>Facility Usage Policies:</strong><br><br><strong>Your Responsibilities:</strong><br>• Keep the room clean after use<br>• Report any damage immediately<br>• Arrive on time for your reservation<br><br><strong>Prohibited:</strong><br>• Food/drinks in Auditorium and Library<br>• Smoking anywhere on campus<br>• Unauthorized equipment modifications<br><br><strong>Payment:</strong> Must be completed 3 days before event<br>Damage to property will be billed to the applicant";
        }

        // 14. Contact/Help
        if (q.includes('contact') || q.includes('phone') || q.includes('email') || q.includes('office')) {
            return "<strong>Need More Help?</strong><br><br>Visit the <strong>Administration Office</strong> for:<br>• Payment processing<br>• Special requests<br>• Policy clarifications<br>• Reservation confirmations<br><br>Office hours: Monday-Friday, 8:00 AM - 5:00 PM";
        }

        // 15. Upcoming events
        if (q.includes('event') || q.includes('upcoming') || q.includes('schedule')) {
            return "<strong>Upcoming Events:</strong><br><br>Check the calendar for major school events! Facilities may have limited availability during:<br>• Foundation Day<br>• Sports Day<br>• Graduation ceremonies<br>• Parent-Teacher conferences<br><br>Book early to secure your preferred dates!";
        }

        // 16. Login/Account questions
        if (q.includes('login') || q.includes('account') || q.includes('register') || q.includes('sign')) {
            return "<strong>Login Information:</strong><br><br>Click the <strong>'Login'</strong> button in the top-right corner.<br><br>• <strong>Community Members:</strong> Use your phone number<br>• <strong>BCHS Staff:</strong> Toggle 'Staff member' and use your Staff ID<br><br>Logging in helps track your reservations and enables cancellations!";
        }

        // Default Help - Enhanced
        return "<strong>I'm your BCHS Reservation Assistant!</strong><br><br>I can help you with:<br><br><strong>Reservation:</strong> 'How do I book?', 'Reservation steps'<br><strong>Capacity:</strong> 'Room capacities', 'How many people fit?'<br><strong>Availability:</strong> 'Is the gym free?', 'Check availability'<br><strong>Payment:</strong> 'How to pay?', 'Payment deadline', 'Pricing'<br><strong>Facilities:</strong> 'Tell me about the auditorium'<br><strong>Cancellation:</strong> 'How to cancel?'<br><strong>Policies:</strong> 'What are the rules?'<br><br>Just ask me anything!";
    }

    attachEventListeners() {
        this.sendBtn?.addEventListener('click', () => this.sendMessage());
        this.input?.addEventListener('keypress', (e) => { if (e.key === 'Enter') this.sendMessage(); });
    }
}
