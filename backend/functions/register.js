// netlify/functions/register.js
const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Parse the request body
    const data = JSON.parse(event.body);
    
    // Validate required fields
    const { name, email, phone, group } = data;
    if (!name || !email || !phone || !group) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Missing required fields',
          required: ['name', 'email', 'phone', 'group']
        })
      };
    }

    // Airtable configuration
    const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID || 'appxZlqnBp1am0S1O';
    const AIRTABLE_TABLE_ID = process.env.AIRTABLE_TABLE_ID || 'tblgR3eSEG8qmJNsT';
    const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN || 'pat14mKr4y7Z0XEyN.d193281c0a2733ccf3d94e9ebb6e94601c2ca27b32b1a682951e8d8d358a04b1';

    // Prepare Airtable record
    const airtableData = {
      records: [{
        fields: {
          Name: name,
          Email: email,
          Phone: phone,
          Group: group,
          Score: data.score || 0,
          Registration_Status: 'Pending',
          Payment_Status: 'Pending',
          Message_Count: 0,
          Registration_Date: new Date().toISOString().split('T')[0],
          Source: 'Website Registration'
        }
      }]
    };

    // Send to Airtable
    const airtableUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}`;
    
    const airtableResponse = await fetch(airtableUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(airtableData)
    });

    if (!airtableResponse.ok) {
      const errorText = await airtableResponse.text();
      console.error('Airtable error:', errorText);
      throw new Error(`Airtable API error: ${airtableResponse.status}`);
    }

    const airtableResult = await airtableResponse.json();
    
    // Success response
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Registration successful',
        recordId: airtableResult.records[0].id,
        data: {
          name,
          email,
          group,
          registrationDate: airtableResult.records[0].fields.Registration_Date
        }
      })
    };

  } catch (error) {
    console.error('Registration error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Registration failed',
        message: error.message
      })
    };
  }
};
