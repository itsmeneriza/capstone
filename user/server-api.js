
// Simple Express server to handle reservation requests
// Run this with: node server-api.js

const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(cors()); // Enable CORS for development

// Serve static `data` folder from repository root at `/data` so admin UI can access
// JSON files without adding anything inside `user/`.
const dataPath = path.join(__dirname, '..', 'data');
const repoDataDir = dataPath; // repository-level data directory (../data)
if (fs.existsSync(dataPath)) {
  app.use('/data', express.static(dataPath));
}

// Serve src folder for frontend assets
const srcPath = path.join(__dirname, 'src');
if (fs.existsSync(srcPath)) {
    app.use('/src', express.static(srcPath));
}

// Serve the admin folder at /admin
const adminPath = path.join(__dirname, '..', 'admin');
if (fs.existsSync(adminPath)) {
  app.use('/admin', express.static(adminPath));
}

// Serve static files from public directory
app.use(express.static('public'));

// API endpoint to save new requests to requests.json
app.post('/api/requests', (req, res) => {
  try {
    const newRequest = req.body;
    // Read current requests.json from repository-level data folder
    const requestsPath = path.join(repoDataDir, 'requests.json');
    let requestsData = { requests: [] };
    if (fs.existsSync(requestsPath)) {
      requestsData = JSON.parse(fs.readFileSync(requestsPath, 'utf8'));
    }

    // Ensure array exists
    if (!Array.isArray(requestsData.requests)) requestsData.requests = [];

    // Add new request to the end
    requestsData.requests.push(newRequest);

    // Save back to file (repo-level)
    fs.writeFileSync(requestsPath, JSON.stringify(requestsData, null, 2), 'utf8');
    
    console.log('✅ New request saved:', newRequest.id);
    
    res.status(200).json({
      success: true,
      message: 'Request saved successfully',
      request: newRequest
    });
    
  } catch (error) {
    console.error('❌ Error saving request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save request',
      error: error.message
    });
  }
});

// API endpoint to save new events to events.json
app.post('/api/events', (req, res) => {
  try {
    const newEvent = req.body;
    const eventsPath = path.join(repoDataDir, 'events.json');
    let eventsData = { events: [] };
    if (fs.existsSync(eventsPath)) {
      eventsData = JSON.parse(fs.readFileSync(eventsPath, 'utf8'));
    }
    if (!Array.isArray(eventsData.events)) eventsData.events = [];
    eventsData.events.push(newEvent);
    fs.writeFileSync(eventsPath, JSON.stringify(eventsData, null, 2), 'utf8');
    
    console.log('✅ New event saved:', newEvent.id);
    res.status(200).json({ success: true, message: 'Event saved successfully', event: newEvent });
  } catch (error) {
    console.error('❌ Error saving event:', error);
    res.status(500).json({ success: false, message: 'Failed to save event', error: error.message });
  }
});

// API endpoint to get all requests
app.get('/api/requests', (req, res) => {
  try {
    const requestsPath = path.join(repoDataDir, 'requests.json');
    if (!fs.existsSync(requestsPath)) {
      return res.status(200).json({ requests: [] });
    }
    const requestsData = JSON.parse(fs.readFileSync(requestsPath, 'utf8'));
    res.status(200).json(requestsData);
  } catch (error) {
    console.error('❌ Error reading requests:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to read requests',
      error: error.message
    });
  }
});

// API endpoint to save reservations (when admin approves)
app.post('/api/reservations', (req, res) => {
  try {
    const newreservation = req.body;
    // Read current reservations.json from repository-level data folder
    const reservationsPath = path.join(repoDataDir, 'reservations.json');
    let reservationsData = { reservations: [] };
    if (fs.existsSync(reservationsPath)) {
      reservationsData = JSON.parse(fs.readFileSync(reservationsPath, 'utf8'));
    }
    if (!Array.isArray(reservationsData.reservations)) reservationsData.reservations = [];
    reservationsData.reservations.push(newreservation);
    fs.writeFileSync(reservationsPath, JSON.stringify(reservationsData, null, 2), 'utf8');
    
    console.log('✅ New reservation saved:', newreservation.id);
    
    res.status(200).json({
      success: true,
      message: 'reservation saved successfully',
      reservation: newreservation
    });
    
  } catch (error) {
    console.error('❌ Error saving reservation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save reservation',
      error: error.message
    });
  }
});

// API endpoint to update request status
app.patch('/api/requests/:id', (req, res) => {
  try {
    const requestId = req.params.id;
    const updates = req.body;
    
    // Read current requests.json
    const requestsPath = path.join(repoDataDir, 'requests.json');
    const requestsData = fs.existsSync(requestsPath) ? JSON.parse(fs.readFileSync(requestsPath, 'utf8')) : { requests: [] };
    
    // Find and update the request
    const requestIndex = requestsData.requests.findIndex(r => r.id === requestId);
    
    if (requestIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }
    
    // Update the request
    requestsData.requests[requestIndex] = {
      ...requestsData.requests[requestIndex],
      ...updates
    };
    
    // Save back to file
    fs.writeFileSync(requestsPath, JSON.stringify(requestsData, null, 2), 'utf8');
    
    console.log('✅ Request updated:', requestId);
    
    res.status(200).json({
      success: true,
      message: 'Request updated successfully',
      request: requestsData.requests[requestIndex]
    });
    
  } catch (error) {
    console.error('❌ Error updating request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update request',
      error: error.message
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════╗
║   🚀 BCHS reservation Server Running!             ║
║                                                ║
║   Server URL: http://localhost:${PORT}/         ║
║   Admin Panel: http://localhost:${PORT}/admin/admin.html ║
║   User App: http://localhost:${PORT}/           ║
║                                                ║
║   API Endpoints:                               ║
║   POST   /api/requests  - Create new request  ║
║   GET    /api/requests  - Get all requests    ║
║   PATCH  /api/requests/:id - Update request   ║
║   POST   /api/reservations  - Create new reservation  ║
║   POST   /api/events    - Post new school event║
╚════════════════════════════════════════════════╝
  `);
});
