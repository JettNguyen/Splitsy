// Quick test for individual group access
const http = require('http');

function makeRequest(method, path, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const fullPath = path === '/health' ? '/health' : `/api${path}`;
    
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: fullPath,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: responseData });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function testIndividualGroupAccess() {
  console.log('🔍 Testing individual group access after fixes\n');

  try {
    // Login with the test user we created
    const loginData = {
      email: 'testuser@splitsy.app',
      password: 'TestPass123'
    };

    const loginResponse = await makeRequest('POST', '/auth/login', loginData);
    if (loginResponse.status !== 200) {
      throw new Error('Failed to login');
    }

    const authToken = loginResponse.data.token;
    console.log('✅ Logged in successfully');

    // Get all groups
    const groupsResponse = await makeRequest('GET', '/groups', null, authToken);
    console.log(`✅ Found ${groupsResponse.data.length} groups`);

    if (groupsResponse.data.length === 0) {
      console.log('ℹ️  No groups found. Creating a test group...');
      
      const newGroupResponse = await makeRequest('POST', '/groups', {
        name: 'Test Access Group',
        description: 'Testing individual access'
      }, authToken);
      
      if (newGroupResponse.status === 201) {
        groupsResponse.data.push(newGroupResponse.data.group);
        console.log('✅ Created test group');
      }
    }

    // Test accessing each group individually
    for (const group of groupsResponse.data) {
      console.log(`\nTesting access to: ${group.name} (ID: ${group.id})`);
      
      const individualResponse = await makeRequest('GET', `/groups/${group.id}`, null, authToken);
      
      if (individualResponse.status === 200) {
        console.log(`✅ Success: Can access ${group.name}`);
        console.log(`   Group has ${individualResponse.data.data.group.members.length} members`);
      } else {
        console.log(`❌ Failed: ${individualResponse.data.message}`);
        console.log(`   Status: ${individualResponse.status}`);
      }
    }

    console.log('\n🎉 Individual group access test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testIndividualGroupAccess();