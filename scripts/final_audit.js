const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';
let token = '';

const runAudit = async () => {
    try {
        // 1. Auth
        const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
            email: 'admin1@syict.com',
            password: 'password123'
        });
        token = loginRes.data.token;
        const config = { headers: { Authorization: `Bearer ${token}` } };
        console.log('✅ Auth: OK');

        // 2. READ Tests
        const modules = [
            { name: 'Courses', endpoint: 'courses' },
            { name: 'Enrollments', endpoint: 'enrollments' },
            { name: 'Invoices', endpoint: 'invoices' },
            { name: 'Leads', endpoint: 'crm' },
            { name: 'Assets', endpoint: 'assets' },
            { name: 'Sessions', endpoint: 'sessions' },
            { name: 'Notifications', endpoint: 'notifications' }
        ];

        for (const mod of modules) {
            const res = await axios.get(`${BASE_URL}/${mod.endpoint}`, config);
            const count = Array.isArray(res.data.data) ? res.data.data.length : (res.data.data ? 1 : 0);
            console.log(`✅ READ ${mod.name}: OK (${count} found)`);
        }

        // 3. CREATE Test (Lead)
        const leadRes = await axios.post(`${BASE_URL}/crm`, {
            name: 'Audit Test Lead',
            email: 'audit@test.com',
            branchId: loginRes.data.user.branchId
        }, config);
        const newLeadId = leadRes.data.data._id;
        console.log('✅ CREATE Lead: OK');

        // 4. UPDATE Test (Lead)
        await axios.put(`${BASE_URL}/crm/${newLeadId}`, {
            status: 'contacted'
        }, config);
        console.log('✅ UPDATE Lead: OK');

        // 5. DELETE Test (Lead)
        await axios.delete(`${BASE_URL}/crm/${newLeadId}`, config);
        console.log('✅ DELETE Lead: OK');

        console.log('\n--- AUDIT COMPLETE ---');
    } catch (err) {
        console.error('❌ Audit Failed at:', err.config?.url || 'Logic');
        console.error('Error Details:', err.response?.data || err.message);
        process.exit(1);
    }
};

runAudit();
