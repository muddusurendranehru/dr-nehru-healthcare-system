// server.js - Homa Clinic Healthcare Appointment Booking System
require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const patientRoutes = require('./patient-routes');
const app = express();
const PORT = process.env.PORT || 3000;

console.log('🏥 Starting Homa Clinic System...');

// Security middleware
app.use(express.json());
app.use('/', patientRoutes);
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

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'homa_clinic',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

let pool;

// Initialize database
async function initializeDatabase() {
  try {
    console.log('🔌 Connecting to database...');
    
    // Connect without database first
    const tempConfig = { ...dbConfig };
    delete tempConfig.database;
    const tempConnection = await mysql.createConnection(tempConfig);
    
    // Create database if not exists
    await tempConnection.execute(`CREATE DATABASE IF NOT EXISTS ${dbConfig.database}`);
    await tempConnection.end();
    
    // Connect to actual database
    pool = mysql.createPool(dbConfig);
    const connection = await pool.getConnection();
    
    // Create tables
    await createTables(connection);
    connection.release();
    
    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Database error:', error.message);
    console.log('💡 Make sure MySQL is running');
  }
}

// Create database tables
async function createTables(connection) {
  // Users table
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      first_name VARCHAR(100) NOT NULL,
      last_name VARCHAR(100) NOT NULL,
      phone VARCHAR(20),
      role ENUM('admin', 'doctor', 'patient') DEFAULT 'patient',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Appointments table
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS appointments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      patient_id INT NOT NULL,
      doctor_id INT NOT NULL,
      appointment_date DATETIME NOT NULL,
      duration_minutes INT DEFAULT 30,
      status ENUM('scheduled', 'confirmed', 'cancelled', 'completed') DEFAULT 'scheduled',
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (patient_id) REFERENCES users(id),
      FOREIGN KEY (doctor_id) REFERENCES users(id)
    )
  `);

  // Create admin user if not exists
  const [adminUsers] = await connection.execute(
    'SELECT id FROM users WHERE role = "admin" LIMIT 1'
  );

  if (adminUsers.length === 0) {
    const hashedPassword = await bcrypt.hash('admin123', 12);
    await connection.execute(
      'INSERT INTO users (email, password, first_name, last_name, role) VALUES (?, ?, ?, ?, ?)',
      ['admin@homaclinic.com', hashedPassword, 'Admin', 'User', 'admin']
    );
    console.log('👤 Admin user created: admin@homaclinic.com / admin123');
  }
}

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret', (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

// Routes

// Home page
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>🏥 Homa Clinic System</title>
        <style>
            body { font-family: Arial; max-width: 800px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; background: #007bff; color: white; padding: 20px; border-radius: 10px; }
            .status { background: #d4edda; padding: 15px; margin: 20px 0; border-radius: 5px; }
            .endpoint { margin: 10px 0; padding: 10px; background: #f8f9fa; border-left: 4px solid #007bff; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>🏥 Homa Clinic Healthcare System</h1>
            <p>Appointment Booking & Management Platform</p>
        </div>
        
        <div class="status">
            <h3>✅ System Status: ONLINE</h3>
            <p><strong>Server:</strong> Running on port ${PORT}</p>
            <p><strong>Database:</strong> ${pool ? 'Connected' : 'Not connected'}</p>
        </div>

        <div class="endpoint">
            <h3>🔑 Default Admin Login</h3>
            <p><strong>Email:</strong> admin@homaclinic.com</p>
            <p><strong>Password:</strong> admin123</p>
        </div>

        <div class="endpoint">
            <h3>📋 API Endpoints</h3>
            <p><strong>POST /api/register</strong> - Register new user</p>
            <p><strong>POST /api/login</strong> - User login</p>
            <p><strong>GET /api/doctors</strong> - List doctors</p>
            <p><strong>POST /api/appointments</strong> - Book appointment</p>
            <p><strong>GET /health</strong> - Health check</p>
        </div>
    </body>
    </html>
  `);
});

// User registration
// User registration with Airtable integration
app.post('/api/register', [
  body('email').isEmail(),
  body('first_name').trim().isLength({ min: 1 }),
  body('last_name').trim().isLength({ min: 1 })
], async (req, res) => {
  try {
    const axios = require('axios');
    
    const { email, first_name, last_name, phone } = req.body;
    
    // Add to Airtable instead of MySQL
    const airtableData = {
      fields: {
        'Name': `${first_name} ${last_name}`,
        'Phone': phone || '',
        'Email': email || '',
        'Group': 'C',
        'Score': 0,
        'Registration_Status': 'Pending',
        'Payment_Status': 'Unpaid',
        'Message_Count': 0
      }
    };
// Health check for registration API
app.get('/api/register', (req, res) => {
  res.json({
    status: 'Registration API is working',
    method: 'POST',
    message: 'Send POST request with name, email, phone to register patients',
    airtableConnected: true
  });
});
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

    res.status(201).json({ 
      message: 'Patient registered successfully', 
      airtableId: response.data.id 
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});
// User login
app.post('/api/login', [
  body('email').isEmail(),
  body('password').exists()
], async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const [users] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = users[0];
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get doctors
app.get('/api/doctors', authenticateToken, async (req, res) => {
  try {
    const [doctors] = await pool.execute(
      'SELECT id, first_name, last_name, email FROM users WHERE role = "doctor"'
    );
    res.json(doctors);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch doctors' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});
// ADD THIS TO YOUR server.js FILE
// Add this code right before the "Start server" section

// Admin Dashboard Route
app.get('/admin', (req, res) => {
    const fs = require('fs');
    const path = require('path');
    
    // Read patients from JSON file
    const patientsFilePath = path.join(__dirname, 'data', 'patients.json');
    
    try {
        let patients = [];
        if (fs.existsSync(patientsFilePath)) {
            const data = fs.readFileSync(patientsFilePath, 'utf8');
            patients = JSON.parse(data);
        }
        
        // Create HTML response
        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Dashboard - Homa Clinic</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 15px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 2.5em;
            font-weight: 300;
        }
        .stats {
            display: flex;
            justify-content: space-around;
            padding: 30px;
            background: #f8f9fa;
            border-bottom: 1px solid #dee2e6;
        }
        .stat-card {
            text-align: center;
            padding: 20px;
            background: white;
            border-radius: 10px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.08);
            min-width: 150px;
        }
        .stat-number {
            font-size: 2.5em;
            font-weight: bold;
            color: #667eea;
            margin-bottom: 10px;
        }
        .stat-label {
            color: #6c757d;
            font-size: 0.9em;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .content {
            padding: 30px;
        }
        .table-container {
            overflow-x: auto;
            background: white;
            border-radius: 10px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.08);
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 0;
        }
        th, td {
            padding: 15px;
            text-align: left;
            border-bottom: 1px solid #dee2e6;
        }
        th {
            background: #f8f9fa;
            font-weight: 600;
            color: #495057;
            text-transform: uppercase;
            font-size: 0.85em;
            letter-spacing: 1px;
        }
        tr:hover {
            background: #f8f9fa;
        }
        .badge {
            display: inline-block;
            padding: 4px 12px;
            background: #28a745;
            color: white;
            border-radius: 20px;
            font-size: 0.8em;
            font-weight: 500;
        }
        .no-patients {
            text-align: center;
            padding: 60px;
            color: #6c757d;
        }
        .refresh-btn {
            background: #667eea;
            color: white;
            border: none;
            padding: 12px 25px;
            border-radius: 25px;
            cursor: pointer;
            font-size: 1em;
            margin: 20px 0;
            transition: all 0.3s ease;
        }
        .refresh-btn:hover {
            background: #5a67d8;
            transform: translateY(-2px);
        }
        .recent-badge {
            background: #dc3545;
            animation: pulse 2s infinite;
        }
        @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.7; }
            100% { opacity: 1; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🏥 Admin Dashboard</h1>
            <p>Homa Clinic Healthcare System</p>
        </div>
        
        <div class="stats">
            <div class="stat-card">
                <div class="stat-number">${patients.length}</div>
                <div class="stat-label">Total Patients</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${patients.filter(p => {
                    const regDate = new Date(p.registrationDate);
                    const today = new Date();
                    return regDate.toDateString() === today.toDateString();
                }).length}</div>
                <div class="stat-label">Today's Registrations</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${patients.filter(p => {
                    const regDate = new Date(p.registrationDate);
                    const weekAgo = new Date();
                    weekAgo.setDate(weekAgo.getDate() - 7);
                    return regDate >= weekAgo;
                }).length}</div>
                <div class="stat-label">This Week</div>
            </div>
        </div>
        
        <div class="content">
            <button class="refresh-btn" onclick="window.location.reload()">🔄 Refresh Data</button>
            
            ${patients.length === 0 ? 
                '<div class="no-patients"><h3>No patients registered yet</h3><p>Patients will appear here after registration</p></div>' :
                `<div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Patient Name</th>
                                <th>Email</th>
                                <th>Phone</th>
                                <th>Age</th>
                                <th>Gender</th>
                                <th>Registration Date</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${patients.map(patient => {
                                const regDate = new Date(patient.registrationDate);
                                const isToday = regDate.toDateString() === new Date().toDateString();
                                return `
                                <tr>
                                    <td><strong>${patient.firstName} ${patient.lastName}</strong></td>
                                    <td>${patient.email}</td>
                                    <td>${patient.phone}</td>
                                    <td>${patient.age || 'N/A'}</td>
                                    <td>${patient.gender || 'N/A'}</td>
                                    <td>${regDate.toLocaleDateString()} ${regDate.toLocaleTimeString()}</td>
                                    <td><span class="badge ${isToday ? 'recent-badge' : ''}">${isToday ? 'NEW TODAY' : 'Registered'}</span></td>
                                </tr>`;
                            }).join('')}
                        </tbody>
                    </table>
                </div>`
            }
        </div>
    </div>
</body>
</html>`;
        
        res.send(html);
        
    } catch (error) {
        console.error('Admin dashboard error:', error);
        res.status(500).send(`
            <h1>Admin Dashboard Error</h1>
            <p>Could not load patient data: ${error.message}</p>
            <a href="/admin">Try Again</a>
        `);
    }
});

// Add this route for admin API if needed
app.get('/api/admin/patients', (req, res) => {
    const fs = require('fs');
    const path = require('path');
    
    try {
        const patientsFilePath = path.join(__dirname, 'data', 'patients.json');
        let patients = [];
        
        if (fs.existsSync(patientsFilePath)) {
            const data = fs.readFileSync(patientsFilePath, 'utf8');
            patients = JSON.parse(data);
        }
        
        res.json({
            success: true,
            count: patients.length,
            patients: patients
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
// Simple Admin Route
app.get('/admin', (req, res) => {
    res.send('<h1>Admin Dashboard Works!</h1><p>Testing admin route</p>');
});

// Start server
async function startServer() {
  try {
    await initializeDatabase();
    
    app.listen(PORT, () => {
      console.log('');
      console.log('✅ =======================================');
      console.log('🏥 HOMA CLINIC SYSTEM STARTED!');
      console.log('=======================================');
      console.log(`🌐 Open: http://localhost:${PORT}`);
      console.log('🔑 Admin: admin@homaclinic.com / admin123');
      console.log('=======================================');
      console.log('🛑 Press Ctrl+C to stop');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
  }
}

startServer()// ============ UPI PAYMENT SYSTEM (SAFE ADDITION) ============
// Add this BEFORE the final closing brace of your server.js

app.get('/test-upi', (req, res) => {
  res.send(`
    <html>
    <head>
        <title>UPI Payment Test - Homa Healthcare</title>
        <style>
            body { font-family: Arial; max-width: 400px; margin: 50px auto; padding: 20px; background: #f9f9f9; }
            .card { background: white; padding: 30px; border-radius: 15px; box-shadow: 0 5px 15px rgba(0,0,0,0.1); text-align: center; }
            .header { background: #2c5aa0; color: white; padding: 20px; border-radius: 10px; margin-bottom: 20px; }
            .amount { font-size: 36px; color: #2c5aa0; font-weight: bold; margin: 20px 0; }
            .upi-id { background: #4caf50; color: white; padding: 15px; border-radius: 8px; font-size: 18px; font-weight: bold; margin: 15px 0; }
            .btn { background: #25d366; color: white; padding: 12px 24px; border: none; border-radius: 8px; font-size: 16px; cursor: pointer; text-decoration: none; display: inline-block; margin-top: 15px; }
            .success { background: #e8f5e8; color: #2d5016; padding: 15px; border-radius: 8px; margin: 20px 0; }
        </style>
    </head>
    <body>
        <div class="card">
            <div class="header">
                <h1>🏥 HOMA HEALTHCARE</h1>
                <p>Dr. Muddu Surendra Nehru</p>
                <p>UPI Payment Test</p>
            </div>
            
            <h2>Test Consultation Payment</h2>
            <div class="amount">₹500</div>
            
            <div class="success">
                ✅ Your existing registration system is SAFE<br>
                ✅ This is just a payment test page<br>
                ✅ No changes to your current functionality
            </div>
            
            <h3>💳 Pay via UPI:</h3>
            <div class="upi-id">surendra,muddu-1@okhdfcbank</div>
            
            <p><strong>Steps:</strong></p>
            <p>1. Open Google Pay/PhonePe/Paytm</p>
            <p>2. Send ₹500 to surendra,muddu-1@okhdfcbank</p>
            <p>3. Add reference: TEST-${Date.now().toString().slice(-6)}</p>
            <p>4. Send confirmation via WhatsApp</p>
            
            <a href="https://wa.me/919963721999?text=Test%20UPI%20payment%20completed%20for%20consultation.%20Amount:%20₹500" 
               class="btn">📱 Send Payment Confirmation</a>
        </div>
    </body>
    </html>
  `);
});

console.log('🧪 UPI TEST ROUTE ADDED SAFELY');;
