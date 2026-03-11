// API endpoint to save reservation requests to requests.json
// This should be run on a Node.js server

const fs = require('fs');
const path = require('path');

// Handler for saving new requests
async function saveRequest(req, res) {
  try {
    // Parse the incoming request data
    const newRequest = req.body;

    // Read the current requests.json file
    const requestsPath = path.join(__dirname, '../../data/requests.json');
    const requestsData = JSON.parse(fs.readFileSync(requestsPath, 'utf8'));

    // Add the new request to the requests array
    requestsData.requests.push(newRequest);

    // Write back to the file
    fs.writeFileSync(requestsPath, JSON.stringify(requestsData, null, 2), 'utf8');

    // Send success response
    res.status(200).json({
      success: true,
      message: 'Request saved successfully',
      request: newRequest
    });

  } catch (error) {
    console.error('Error saving request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save request',
      error: error.message
    });
  }
}

// Export for use in Express/Node server
module.exports = { saveRequest };

/* 
USAGE EXAMPLE WITH EXPRESS:

const express = require('express');
const { saveRequest } = require('./api/save-request');
const app = express();

app.use(express.json());

// Enable CORS for development
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  next();
});

// Request endpoint
app.post('/api/requests', saveRequest);

// Serve static files
app.use(express.static('public'));

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
*/
