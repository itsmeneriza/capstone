// This file re-exports data from /data folder for use within /user

export const appData = {
  rooms: [
    { id: 'auditorium', name: 'Auditorium', capacity: 1000 },
    { id: 'library', name: 'Library', capacity: 100 },
    { id: 'grounds', name: 'Grounds', capacity: 180 },
    { id: 'avr', name: 'AVR', capacity: 150 },
    { id: 'gym', name: 'Gym', capacity: 2000 }
  ],
  reservations: [],
  events: [
    {
      id: '1',
      title: 'Science Fair 2024',
      date: 'December 15, 2024',
      time: '9:00 AM - 4:00 PM',
      location: 'Auditorium',
      attendees: 200,
      description: 'Annual science fair showcasing student projects',
      isPast: false
    },
    {
      id: '2',
      title: 'Parent-Teacher Conference',
      date: 'December 10, 2024',
      time: '2:00 PM - 6:00 PM',
      location: 'Library',
      attendees: 150,
      description: 'Meet with teachers to discuss student progress',
      isPast: false
    },
    {
      id: '3',
      title: 'Sports Day',
      date: 'December 20, 2024',
      time: '8:00 AM - 5:00 PM',
      location: 'Grounds',
      attendees: 500,
      description: 'Annual sports competition and activities',
      isPast: false
    },
    {
      id: '4',
      title: 'Graduation Ceremony',
      date: 'November 15, 2024',
      time: '10:00 AM - 12:00 PM',
      location: 'Auditorium',
      attendees: 300,
      description: 'Celebrating our graduating class',
      isPast: true
    },
    {
      id: '5',
      title: 'Book Fair',
      date: 'November 5, 2024',
      time: '9:00 AM - 3:00 PM',
      location: 'Library',
      attendees: 100,
      description: 'Annual book fair with special discounts',
      isPast: true
    }
  ],
  eventBackgrounds: {
    '1': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    '2': 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    '3': 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    '4': 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    '5': 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)'
  }
};

// Helper to load JSON data from /data folder
export async function loadDataFromFile(filename: string) {
  try {
    const response = await fetch(`/data/${filename}`);
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error(`Error loading ${filename}:`, error);
  }
  return null;
}