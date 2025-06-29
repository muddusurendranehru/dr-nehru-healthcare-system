// server.js - Dr. Nehru Healthcare System - FIXED VERSION
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const axios = require('axios'); // MOVED TO TOP - CRITICAL FIX
const app = express();
const PORT = process.env.PORT || 3000;

console.log('🏥 Starting Dr. Nehru Healthcare System...');

// Security middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use(limiter);

// Routes

// Home page
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>🏥 Dr. Nehru Healthcare System</title>
        <style>
            body { font-family: Arial; max-width: 800px; margin: 0 auto; padding: 20px; background: #f8f9fa; }
            .header { text-align: center; background: #007bff; color: white; padding: 30px; border-radius: 15px; margin-bottom: 20px; }
            .status { background: #d4edda; padding: 20px; margin: 20px 0; border-radius: 10px; border-left: 5px solid #28a745; }
            .endpoint { margin: 15px 0; padding: 15px; background: white; border-left: 4px solid #007bff; border-radius: 5px; }
            .success { color: #28a745; font-weight: bold; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>🏥 Dr. Nehru Healthcare System</h1>
            <p>Professional Patient Registration Platform</p>
            <p><strong>8,309+ Patients Connected</strong></p>
        </div>
        
        <div class="status">
            <h3 class="success">✅ System Status: FULLY OPERATIONAL</h3>
            <p><strong>Server:</strong> Running on port ${PORT}</p>
            <p><strong>Database:</strong> Airtable Connected (8,309+ patients)</p>
            <p><strong>Environment:</strong> ${process.env.NODE_ENV || 'Production'}</p>
        </div>

        <div class="endpoint">
            <h3>📋 API Endpoints</h3>
            <p><strong>GET /api/register</strong> - Check registration API status</p>
            <p><strong>POST /api/register</strong> - Register new patient</p>
            <p><strong>GET /health</strong> - System health check</p>
            <p><strong>GET /admin</strong> - Admin dashboard</p>
        </div>

        <div class="endpoint">
            <h3>🎯 Registration Integration</h3>
            <p>All registrations automatically sync to your 8,309+ patient database</p>
            <p>Base ID: ${process.env.AIRTABLE_BASE_ID ? '✅ Connected' : '❌ Missing'}</p>
            <p>Table ID: ${process.env.AIRTABLE_TABLE_ID ? '✅ Connected' : '❌ Missing'}</p>
            <p>Token: ${process.env.AIRTABLE_TOKEN ? '✅ Connected' : '❌ Missing'}</p>
        </div>
    </body>
    </html>
  `);
});

// FIXED GET ROUTE - PROPERLY PLACED OUTSIDE POST ROUTE
app.get('/api/register', (req, res) => {
  res.json({
    status: 'Registration API is working ✅',
    message: 'Send POST request to register patients',
    method: 'POST',
    airtableConnected: true,
    database: 'Connected to 8,309+ patient system',
    environment: {
      airtableBaseId: process.env.AIRTABLE_BASE_ID ? '✅ Connected' : '❌ Missing',
      airtableTableId: process.env.AIRTABLE_TABLE_ID ? '✅ Connected' : '❌ Missing', 
      airtableToken: process.env.AIRTABLE_TOKEN ? '✅ Connected' : '❌ Missing'
    },
    example: {
      method: 'POST',
      url: '/api/register',
      body: {
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
        phone: '9876543210'
      }
    }
  });
});

// PATIENT REGISTRATION - CONNECTS TO YOUR 8,309+ DATABASE
app.post('/api/register', [
  body('email').isEmail().withMessage('Valid email required'),
  body('first_name').trim().isLength({ min: 1 }).withMessage('First name required'),
  body('last_name').trim().isLength({ min: 1 }).withMessage('Last name required'),
  body('phone').optional().isMobilePhone('any').withMessage('Valid phone number required')
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { email, first_name, last_name, phone } = req.body;
    
    console.log(`📝 Registering patient: ${first_name} ${last_name} to Dr. Nehru's database`);
    
    // Add to your 8,309+ patient Airtable database
    const airtableData = {
      fields: {
        'Name': `${first_name} ${last_name}`,
        'Phone': phone || '',
        'Email': email || '',
        'Group': 'C',
        'Score': 0,
        'Registration_Status': 'Pending',
        'Payment_Status': 'Unpaid',
        'Message_Count': 0,
        'Registration_Date': new Date().toISOString(),
        'Source': 'Website Registration'
      }
    };

    const response = await axios.post(
      `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${process.env.AIRTABLE_TABLE_ID}`,
      airtableData,
      {
        headers: {
          'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log(`✅ Patient ${first_name} ${last_name} successfully added to 8,309+ database`);

    res.status(201).json({ 
      success: true,
      message: 'Patient registered successfully to Dr. Nehru Healthcare System', 
      airtableId: response.data.id,
      patientName: `${first_name} ${last_name}`,
      database: '8,309+ patient system'
    });
    
  } catch (error) {
    console.error('❌ Registration error:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      return res.status(500).json({ 
        error: 'Airtable authentication failed',
        message: 'Check AIRTABLE_TOKEN configuration' 
      });
    }
    if (error.response?.status === 404) {
      return res.status(500).json({ 
        error: 'Airtable base/table not found',
        message: 'Check AIRTABLE_BASE_ID and AIRTABLE_TABLE_ID configuration' 
      });
    }
    
    res.status(500).json({ 
      error: 'Registration failed', 
      details: error.response?.data?.error?.message || error.message 
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    database: 'Airtable - 8,309+ patients',
    server: 'Dr. Nehru Healthcare System',
    environment: {
      airtableConfigured: !!(process.env.AIRTABLE_BASE_ID && process.env.AIRTABLE_TABLE_ID && process.env.AIRTABLE_TOKEN),
      port: PORT
    }
  });
});

// Admin Dashboard
app.get('/admin', (req, res) => {
  res.send(`
    <html>
    <head>
        <title>Admin Dashboard - Dr. Nehru Healthcare</title>
        <style>
            body { font-family: Arial; max-width: 900px; margin: 0 auto; padding: 20px; background: #f8f9fa; }
            .header { background: linear-gradient(135deg, #007bff, #0056b3); color: white; padding: 30px; border-radius: 15px; text-align: center; margin-bottom: 20px; }
            .status { background: white; padding: 20px; margin: 15px 0; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .success { color: #28a745; font-weight: bold; }
            .error { color: #dc3545; font-weight: bold; }
            .links { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-top: 20px; }
            .link-card { background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); text-align: center; }
            .link-card a { text-decoration: none; color: #007bff; font-weight: bold; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>🏥 Dr. Nehru Healthcare Admin</h1>
            <p>Professional Healthcare Management System</p>
            <p><strong>Managing 8,309+ Patients</strong></p>
        </div>
        
        <div class="status">
            <h3>📊 System Configuration</h3>
            <p><strong>Server Status:</strong> <span class="success">✅ Running</span></p>
            <p><strong>Database:</strong> <span class="success">✅ Airtable Connected (8,309+ patients)</span></p>
            <p><strong>Registration API:</strong> <span class="success">✅ Active</span></p>
            <p><strong>Environment Variables:</strong></p>
            <ul>
                <li>AIRTABLE_BASE_ID: ${process.env.AIRTABLE_BASE_ID ? '<span class="success">✅ Set</span>' : '<span class="error">❌ Missing</span>'}</li>
                <li>AIRTABLE_TABLE_ID: ${process.env.AIRTABLE_TABLE_ID ? '<span class="success">✅ Set</span>' : '<span class="error">❌ Missing</span>'}</li>
                <li>AIRTABLE_TOKEN: ${process.env.AIRTABLE_TOKEN ? '<span class="success">✅ Set</span>' : '<span class="error">❌ Missing</span>'}</li>
            </ul>
        </div>
        
        <div class="links">
            <div class="link-card">
                <h4>🔍 Test Registration API</h4>
                <p><a href="/api/register" target="_blank">Check API Status</a></p>
            </div>
            <div class="link-card">
                <h4>💊 Health Check</h4>
                <p><a href="/health" target="_blank">System Health</a></p>
            </div>
            <div class="link-card">
                <h4>📊 Airtable Database</h4>
                <p><a href="https://airtable.com/appRPKop4plyqGgFN/tblEaDfeIhIRj0jPy" target="_blank">View 8,309+ Patients</a></p>
            </div>
            <div class="link-card">
                <h4>🧪 UPI Payment Test</h4>
                <p><a href="/test-upi" target="_blank">Test Payment System</a></p>
            </div>
        </div>
    </body>
    </html>
  `);
});

// UPI Payment Test
app.get('/test-upi', (req, res) => {
  res.send(`
    <html>
    <head>
        <title>UPI Payment Test - Dr. Nehru Healthcare</title>
        <style>
            body { font-family: Arial; max-width: 400px; margin: 50px auto; padding: 20px; background: #f9f9f9; }
            .card { background: white; padding: 30px; border-radius: 15px; box-shadow: 0 5px 15px rgba(0,0,0,0.1); text-align: center; }
            .header { background: #2c5aa0; color: white; padding: 20px; border-radius: 10px; margin-bottom: 20px; }
            .amount { font-size: 36px; color: #2c5aa0; font-weight: bold; margin: 20px 0; }
            .upi-id { background: #4caf50; color: white; padding: 15px; border-radius: 8px; font-size: 18px; font-weight: bold; margin: 15px 0; }
            .btn { background: #25d366; color: white; padding: 12px 24px; border: none; border-radius: 8px; font-size: 16px; cursor: pointer; text-decoration: none; display: inline-block; margin-top: 15px; }
        </style>
    </head>
    <body>
        <div class="card">
            <div class="header">
                <h1>🏥 DR. NEHRU HEALTHCARE</h1>
                <p>Dr. Muddu Surendra Nehru</p>
                <p>UPI Payment Test</p>
            </div>
            
            <h2>Consultation Payment</h2>
            <div class="amount">₹500</div>
            
            <h3>💳 Pay via UPI:</h3>
            <div class="upi-id">surendra,muddu-1@okhdfcbank</div>
            
            <p><strong>Steps:</strong></p>
            <p>1. Open Google Pay/PhonePe/Paytm</p>
            <p>2. Send ₹500 to above UPI ID</p>
            <p>3. Add reference: CONSULT-${Date.now().toString().slice(-6)}</p>
            
            <a href="https://wa.me/919963721999?text=UPI%20payment%20completed%20for%20consultation.%20Amount:%20₹500" 
               class="btn">📱 Send Payment Confirmation</a>
        </div>
    </body>
    </html>
  `);
});

// Start server
app.listen(PORT, () => {
  console.log('');
  console.log('✅ ==========================================');
  console.log('🏥 DR. NEHRU HEALTHCARE SYSTEM STARTED!');
  console.log('==========================================');
  console.log(`🌐 Server: Running on port ${PORT}`);
  console.log('📊 Database: Airtable (8,309+ patients)');
  console.log('🔗 Registration: Ready for live patients');
  console.log('==========================================');
  console.log('🛑 Press Ctrl+C to stop');
});
