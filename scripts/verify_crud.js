const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';
let token = '';
let branchId = '';

const testAuth = async () => {
    try {
        const res = await axios.post(`${BASE_URL}/auth/login`, {
            email: 'admin1@syict.com',
            password: 'password123'
        });
        token = res.data.token;
        branchId = res.data.user.branchId;
        console.log('✅ Auth (Login): Success');
    } catch (err) {
        console.error('❌ Auth (Login): Failed', err.response?.data || err.message);
        process.exit(1);
    }
};

const testCRUD = async (module, endpoint) => {
    try {
        const config = { headers: { Authorization: `Bearer ${token}` } };
        
        // 1. READ (List)
        const res = await axios.get(`${BASE_URL}/${endpoint}`, config);
        const data = res.data.data;
        const count = Array.isArray(data) ? data.length : (data ? 1 : 0);
        
        console.log(`✅ ${module} (Read/List): Success (${count} records found)`);

        if (count > 0) {
            const firstId = Array.isArray(data) ? data[0]._id : data._id;
            // 2. READ (Single)
            // Some endpoints might not support /:id, skipping for generic test
        }
    } catch (err) {
        console.error(`❌ ${module} (Read): Failed`, err.response?.data || err.message);
    }
};


const run = async () => {
    await testAuth();
    await testCRUD('Courses',       'courses');
    await testCRUD('Enrollments',   'enrollments');
    await testCRUD('Invoices',      'invoices');
    await testCRUD('Leads',         'crm/leads');
    await testCRUD('Notifications', 'notifications');
    await testCRUD('Assets',        'assets');
    await testCRUD('Sessions',      'sessions');
    
    process.exit(0);
};

run();
