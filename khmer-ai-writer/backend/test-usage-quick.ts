import axios, { AxiosError } from 'axios';

const BASE_URL = 'http://localhost:8080/api';
let token = '';

async function test() {
  try {
    // 1. Login
    console.log('1. Testing login...');
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@example.com',
      password: 'Admin123!@#'
    }).catch((err: AxiosError) => {
      console.error('Login failed:', err.code, err.message);
      if (err.response) {
        console.error('Response:', err.response.status, err.response.data);
      }
      throw err;
    });
    token = loginRes.data.token;
    console.log('✓ Login successful, token:', token.substring(0, 20) + '...');

    // 2. Get user usage
    console.log('\n2. Testing GET /api/usage/user...');
    const usageRes = await axios.get(`${BASE_URL}/usage/user`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✓ User usage:', JSON.stringify(usageRes.data, null, 2));

    // 3. Get tier limits
    console.log('\n3. Testing GET /api/usage/tier-limits...');
    const limitsRes = await axios.get(`${BASE_URL}/usage/tier-limits?tier=premium`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✓ Tier limits:', JSON.stringify(limitsRes.data, null, 2));

    // 4. Check limit
    console.log('\n4. Testing GET /api/usage/check-limit...');
    const checkRes = await axios.get(`${BASE_URL}/usage/check-limit?actionType=api_call`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✓ Can perform scan:', checkRes.data);

    console.log('\n✓ All tests passed!');
  } catch (error: any) {
    console.error('✗ Test failed:', error.response?.data || error.message || error);
  }
}

test();
