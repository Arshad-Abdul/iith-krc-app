const axios = require('axios');
async function test() {
  try {
    const res = await axios.post('http://localhost:4002/api/auth/login', { userid: 'st1234', password: 'testpassword' });
    console.log('Login:', res.data.patron ? 'Success' : 'Failed');
    const res2 = await axios.get('http://localhost:4002/api/me', { headers: { Authorization: 'Bearer ' + res.data.token } });
    console.log('Me:', res2.data.patron ? 'Success' : 'Failed');
  } catch (e) {
    console.error(e.response ? e.response.data : e.message);
  }
}
test();
