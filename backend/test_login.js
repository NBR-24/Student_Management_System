const axios = require('axios');

console.log('Testing login...');

axios.post('http://localhost:5000/api/auth/login', {
    email: 'admin@admin.com',
    password: 'admin123'
})
    .then(res => {
        console.log('✅ Login Success!');
        console.log('Token:', res.data.token ? 'Received' : 'Missing');
        console.log('User Role:', res.data.user.role);
    })
    .catch(err => {
        console.error('❌ Login Failed:', err.message);
        if (err.response) {
            console.error('Status:', err.response.status);
            console.error('Data:', JSON.stringify(err.response.data, null, 2));
        } else if (err.request) {
            console.error('No response received (Network Error?)');
        }
    });
