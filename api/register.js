// Vercel serverless function for patient registration
import axios from 'axios';

// Airtable configuration from environment variables
const AIRTABLE_CONFIG = {
    baseId: process.env.AIRTABLE_BASE_ID || 'appRPKop4plyqGgFN',
    tableId: process.env.AIRTABLE_TABLE_ID || 'tblEaDfeIhIRj0jPy',
    token: process.env.AIRTABLE_TOKEN || 'pat2NG8pd82dzLi1X.d6a23a340b8e5b868baaefd2db06a312d1017cad5afef064d1391c7f06be189a'
};

// Function to add patient to Airtable
async function addToAirtable(patientData) {
    try {
        const airtableData = {
            fields: {
                'Name': patientData.name || '',
                'Phone': patientData.phone || '',
                'Email': patientData.email || '',
                'Group': 'C',
                'Score': 0,
                'Registration_Status': 'Pending',
                'Payment_Status': 'Unpaid',
                'Message_Count': 0
            }
        };

        const response = await axios.post(
            `https://api.airtable.com/v0/${AIRTABLE_CONFIG.baseId}/${AIRTABLE_CONFIG.tableId}`,
            airtableData,
            {
                headers: {
                    'Authorization': `Bearer ${AIRTABLE_CONFIG.token}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        return { success: true, id: response.data.id };
    } catch (error) {
        console.error('Error adding patient to Airtable:', error);
        return { success: false, error: error.message };
    }
}

// Check for duplicate patients
async function checkDuplicate(phone, email) {
    try {
        let filterFormula = '';
        if (phone && email) {
            filterFormula = `OR({Phone} = '${phone}', {Email} = '${email}')`;
        } else if (phone) {
            filterFormula = `{Phone} = '${phone}'`;
        } else if (email) {
            filterFormula = `{Email} = '${email}'`;
        }

        const response = await axios.get(
            `https://api.airtable.com/v0/${AIRTABLE_CONFIG.baseId}/${AIRTABLE_CONFIG.tableId}`,
            {
                headers: {
                    'Authorization': `Bearer ${AIRTABLE_CONFIG.token}`
                },
                params: {
                    filterByFormula: filterFormula
                }
            }
        );

        return response.data.records.length > 0;
    } catch (error) {
        console.error('Error checking duplicates:', error);
        return false;
    }
}

// Main Vercel serverless function
export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Health check endpoint
    if (req.method === 'GET') {
        return res.status(200).json({
            status: 'running',
            timestamp: new Date().toISOString(),
            airtableConfig: {
                baseId: AIRTABLE_CONFIG.baseId,
                tableId: AIRTABLE_CONFIG.tableId,
                tokenExists: !!AIRTABLE_CONFIG.token
            }
        });
    }

    // Registration endpoint
    if (req.method === 'POST') {
        try {
            const { name, phone, email, age, gender, address } = req.body;

            // Validate required fields
            if (!name || !phone) {
                return res.status(400).json({
                    success: false,
                    message: 'Name and phone are required fields'
                });
            }

            // Check for duplicates
            const isDuplicate = await checkDuplicate(phone, email);
            if (isDuplicate) {
                return res.status(409).json({
                    success: false,
                    message: 'Patient with this phone/email already exists'
                });
            }

            // Add to Airtable
            const result = await addToAirtable({
                name, phone, email, age, gender, address
            });

            if (result.success) {
                return res.status(200).json({
                    success: true,
                    message: 'Patient registered successfully',
                    airtableId: result.id
                });
            } else {
                return res.status(500).json({
                    success: false,
                    message: 'Failed to register patient',
                    error: result.error
                });
            }

        } catch (error) {
            console.error('Registration error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }

    // Method not allowed
    return res.status(405).json({
        success: false,
        message: 'Method not allowed'
    });
}