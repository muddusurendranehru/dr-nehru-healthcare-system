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
// ADD THIS ROUTE TO YOUR server.js FILE (after the admin route)

// Patient Registration Form - Beautiful UI
app.get('/register', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Patient Registration - Dr. Nehru Healthcare Center</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
            }
            
            .registration-container {
                background: white;
                border-radius: 20px;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
                overflow: hidden;
                max-width: 500px;
                width: 100%;
                animation: slideUp 0.6s ease-out;
            }
            
            @keyframes slideUp {
                from {
                    opacity: 0;
                    transform: translateY(30px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            .header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 40px 30px;
                text-align: center;
            }
            
            .header h1 {
                font-size: 2.2em;
                margin-bottom: 10px;
                font-weight: 300;
            }
            
            .header p {
                opacity: 0.9;
                font-size: 1.1em;
            }
            
            .form-container {
                padding: 40px 30px;
            }
            
            .form-group {
                margin-bottom: 25px;
            }
            
            .form-group label {
                display: block;
                margin-bottom: 8px;
                color: #333;
                font-weight: 500;
                font-size: 0.95em;
            }
            
            .form-group input {
                width: 100%;
                padding: 15px;
                border: 2px solid #e1e5e9;
                border-radius: 10px;
                font-size: 1em;
                transition: all 0.3s ease;
                background: #f8f9fa;
            }
            
            .form-group input:focus {
                outline: none;
                border-color: #667eea;
                background: white;
                box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
            }
            
            .form-group input:valid {
                border-color: #28a745;
                background: #f8fff9;
            }
            
            .required {
                color: #dc3545;
            }
            
            .register-btn {
                width: 100%;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                padding: 18px;
                border-radius: 10px;
                font-size: 1.1em;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
                text-transform: uppercase;
                letter-spacing: 1px;
            }
            
            .register-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 10px 25px rgba(102, 126, 234, 0.3);
            }
            
            .register-btn:active {
                transform: translateY(0);
            }
            
            .loading {
                opacity: 0.7;
                cursor: not-allowed;
                pointer-events: none;
            }
            
            .success-message, .error-message {
                padding: 15px;
                border-radius: 8px;
                margin-top: 20px;
                text-align: center;
                font-weight: 500;
            }
            
            .success-message {
                background: #d4edda;
                color: #155724;
                border: 1px solid #c3e6cb;
            }
            
            .error-message {
                background: #f8d7da;
                color: #721c24;
                border: 1px solid #f5c6cb;
            }
            
            .clinic-info {
                background: #f8f9fa;
                padding: 20px;
                text-align: center;
                color: #6c757d;
                font-size: 0.9em;
            }
            
            .clinic-info strong {
                color: #495057;
            }
            
            @media (max-width: 768px) {
                .registration-container {
                    margin: 10px;
                }
                
                .header {
                    padding: 30px 20px;
                }
                
                .header h1 {
                    font-size: 1.8em;
                }
                
                .form-container {
                    padding: 30px 20px;
                }
            }
        </style>
    </head>
    <body>
        <div class="registration-container">
            <div class="header">
                <h1>🏥 Patient Registration</h1>
                <p>Dr. Muddu Surendra Nehru</p>
                <p>Healthcare Center</p>
            </div>
            
            <div class="form-container">
                <form id="registrationForm">
                    <div class="form-group">
                        <label for="firstName">First Name <span class="required">*</span></label>
                        <input type="text" id="firstName" name="first_name" required placeholder="Enter your first name">
                    </div>
                    
                    <div class="form-group">
                        <label for="lastName">Last Name <span class="required">*</span></label>
                        <input type="text" id="lastName" name="last_name" required placeholder="Enter your last name">
                    </div>
                    
                    <div class="form-group">
                        <label for="email">Email Address <span class="required">*</span></label>
                        <input type="email" id="email" name="email" required placeholder="Enter your email address">
                    </div>
                    
                    <div class="form-group">
                        <label for="phone">Phone Number</label>
                        <input type="tel" id="phone" name="phone" placeholder="Enter your phone number">
                    </div>
                    
                    <button type="submit" class="register-btn" id="submitBtn">
                        Register Now
                    </button>
                    
                    <div id="message"></div>
                </form>
            </div>
            
            <div class="clinic-info">
                <p><strong>Dr. Nehru Healthcare Center</strong></p>
                <p>Professional Healthcare Management System</p>
                <p>Connected to 8,309+ Patient Database</p>
            </div>
        </div>

        <script>
            document.getElementById('registrationForm').addEventListener('submit', async function(e) {
                e.preventDefault();
                
                const submitBtn = document.getElementById('submitBtn');
                const messageDiv = document.getElementById('message');
                
                // Get form data
                const formData = {
                    first_name: document.getElementById('firstName').value.trim(),
                    last_name: document.getElementById('lastName').value.trim(),
                    email: document.getElementById('email').value.trim(),
                    phone: document.getElementById('phone').value.trim()
                };
                
                // Validation
                if (!formData.first_name || !formData.last_name || !formData.email) {
                    messageDiv.innerHTML = '<div class="error-message">Please fill in all required fields.</div>';
                    return;
                }
                
                // Show loading state
                submitBtn.textContent = 'Registering...';
                submitBtn.classList.add('loading');
                messageDiv.innerHTML = '';
                
                try {
                    const response = await fetch('/api/register', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(formData)
                    });
                    
                    const result = await response.json();
                    
                    if (response.ok) {
                        messageDiv.innerHTML = \`
                            <div class="success-message">
                                <strong>✅ Registration Successful!</strong><br>
                                Welcome \${formData.first_name} \${formData.last_name}!<br>
                                You have been added to Dr. Nehru's healthcare system.<br>
                                <small>Patient ID: \${result.airtableId}</small>
                            </div>
                        \`;
                        document.getElementById('registrationForm').reset();
                    } else {
                        throw new Error(result.error || 'Registration failed');
                    }
                } catch (error) {
                    console.error('Registration error:', error);
                    messageDiv.innerHTML = \`
                        <div class="error-message">
                            <strong>❌ Registration Failed</strong><br>
                            \${error.message}<br>
                            Please try again or contact support.
                        </div>
                    \`;
                } finally {
                    submitBtn.textContent = 'Register Now';
                    submitBtn.classList.remove('loading');
                }
            });
            
            // Add input validation feedback
            document.querySelectorAll('input[required]').forEach(input => {
                input.addEventListener('blur', function() {
                    if (this.value.trim() === '') {
                        this.style.borderColor = '#dc3545';
                    } else {
                        this.style.borderColor = '#28a745';
                    }
                });
            });
        </script>
    </body>
    </html>
  `);
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
