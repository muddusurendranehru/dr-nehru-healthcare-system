// patient-routes.js - Clean version with admin dashboard
const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// Create patients directory if it doesn't exist
const patientsDir = path.join(__dirname, 'data');
const patientsFile = path.join(patientsDir, 'patients.json');

// Ensure data directory exists
if (!fs.existsSync(patientsDir)) {
    fs.mkdirSync(patientsDir, { recursive: true });
}

// Ensure patients.json exists
if (!fs.existsSync(patientsFile)) {
    fs.writeFileSync(patientsFile, JSON.stringify([], null, 2));
}

// Helper function to read patients from file
function readPatients() {
    try {
        const data = fs.readFileSync(patientsFile, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.log('Error reading patients file, creating new one:', error.message);
        return [];
    }
}

// Helper function to write patients to file
function writePatients(patients) {
    try {
        fs.writeFileSync(patientsFile, JSON.stringify(patients, null, 2));
        return true;
    } catch (error) {
        console.error('Error writing patients file:', error.message);
        return false;
    }
}

// ======= PATIENT REGISTRATION ROUTES =======

// Register new patient
router.post('/register-patient', (req, res) => {
    try {
        const { name, phone, email, age, gender, address } = req.body;
        
        // Validate required fields
        if (!name || !phone) {
            return res.status(400).json({
                success: false,
                message: 'Name and phone are required'
            });
        }

        // Read existing patients
        const patients = readPatients();
        
        // Create new patient object
        const newPatient = {
            id: Date.now(),
            name: name,
            phone: phone,
            email: email || '',
            age: age || '',
            gender: gender || '',
            address: address || '',
            registrationTime: new Date().toISOString(),
            status: 'new'
        };

        // Add new patient
        patients.push(newPatient);

        // Save to file
        if (writePatients(patients)) {
            console.log('✅ New patient registered:', name);
            res.json({
                success: true,
                message: 'Registration successful! We will contact you soon.',
                patientId: newPatient.id
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Failed to save registration. Please try again.'
            });
        }

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Registration failed. Please try again.'
        });
    }
});

// Get all patients (for admin use)
router.get('/patients', (req, res) => {
    try {
        const patients = readPatients();
        res.json({
            success: true,
            patients: patients,
            count: patients.length
        });
    } catch (error) {
        console.error('Error fetching patients:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch patients'
        });
    }
});

// Search patients by name or email (for admin use)
router.get('/patients/search', (req, res) => {
    try {
        const { q } = req.query;
        if (!q) {
            return res.status(400).json({
                success: false,
                message: 'Search query required'
            });
        }

        const patients = readPatients();
        const searchterm = q.toLowerCase();

        const results = patients.filter(patient =>
            patient.name.toLowerCase().includes(searchterm) ||
            patient.email.toLowerCase().includes(searchterm)
        );

        res.json({
            success: true,
            patients: results,
            count: results.length,
            searchTerm: q
        });
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({
            success: false,
            message: 'Search failed'
        });
    }
});

// ======= ADMIN DASHBOARD ROUTES =======

// Serve admin dashboard
router.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin-dashboard.html'));
});

// API endpoint for admin dashboard
router.get(app.use('/', patientRoutes); (req, res) => {
    try {
        const patients = readPatients();
        
        // Format patients for admin dashboard
        const formattedPatients = patients.map((patient, index) => ({
            id: patient.id || index + 1,
            name: patient.name || 'N/A',
            phone: patient.phone || 'N/A',
            email: patient.email || 'N/A',
            age: patient.age || 'N/A',
            gender: patient.gender || 'N/A',
            address: patient.address || 'N/A',
            registrationTime: patient.registrationTime || new Date().toISOString(),
            status: patient.status || 'new'
        }));

        // Sort by registration time (newest first)
        formattedPatients.sort((a, b) => new Date(b.registrationTime) - new Date(a.registrationTime));

        res.json(formattedPatients);

    } catch (error) {
        console.error('Error reading patients for admin:', error);
        res.status(500).json({ error: 'Failed to read patient data' });
    }
});

// Export patients as CSV
router.get('/admin', (req, res) => {
    try {
        const patients = readPatients();

        // Create CSV content
        const headers = ['Name', 'Phone', 'Email', 'Age', 'Gender', 'Address', 'Registration Time', 'Status'];
        let csvContent = headers.join(',') + '\n';

        patients.forEach(patient => {
            const row = [
                `"${patient.name || ''}"`,
                `"${patient.phone || ''}"`,
                `"${patient.email || ''}"`,
                `"${patient.age || ''}"`,
                `"${patient.gender || ''}"`,
                `"${(patient.address || '').replace(/"/g, '""')}"`,
                `"${patient.registrationTime || ''}"`,
                `"${patient.status || 'new'}"`
            ];
            csvContent += row.join(',') + '\n';
        });

        // Set headers for download
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=homa_patients_${new Date().toISOString().split('T')[0]}.csv`);
        res.send(csvContent);

    } catch (error) {
        console.error('Error exporting patients:', error);
        res.status(500).send('Export failed');
    }
});

console.log('✅ Homa Healthcare patient routes loaded successfully!');
console.log('📋 Patient registration: /register-patient');
console.log('👥 Admin dashboard: /admin');
console.log('📊 Patient API: /api/patients');

module.exports = router;