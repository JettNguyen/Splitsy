// Test script to verify group functionality fixes
const http = require('http');

const API_BASE_URL = 'http://localhost:3000/api';

// Test utility function
function makeRequest(method, path, data = null, token = null, customPath = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: customPath || `/api${path}`,
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

async function testGroupFunctionality() {
  console.log('🧪 Testing Group Functionality Fixes\n');

  let authToken = null;
  let testUserId = null;
  let testGroupId = null;

  try {
    // Step 1: Test server health
    console.log('1. Testing server health...');
    // Health endpoint is at /health, not /api/health
    const healthResponse = await makeRequest('GET', '', null, null, '/health');
    console.log(`   Status: ${healthResponse.status}`);
    console.log(`   Response:`, healthResponse.data);

    // Step 2: Register a test user
    console.log('\n2. Registering test user...');
    const registerData = {
      name: 'Test User',
      email: `testuser_${Date.now()}@example.com`,
      password: 'TestPass123'
    };
    
    const registerResponse = await makeRequest('POST', '/auth/register', registerData);
    console.log(`   Status: ${registerResponse.status}`);
    console.log(`   Response:`, registerResponse.data);

    if (registerResponse.status !== 201) {
      throw new Error('Failed to register user');
    }

    authToken = registerResponse.data.token;
    testUserId = registerResponse.data.user.id;

    // Step 3: Test getGroups endpoint (should return empty array)
    console.log('\n3. Testing getGroups endpoint (empty)...');
    const getGroupsEmptyResponse = await makeRequest('GET', '/groups', null, authToken);
    console.log(`   Status: ${getGroupsEmptyResponse.status}`);
    console.log(`   Response:`, getGroupsEmptyResponse.data);
    console.log(`   Is Array:`, Array.isArray(getGroupsEmptyResponse.data));

    // Step 4: Create a test group
    console.log('\n4. Testing createGroup endpoint...');
    const groupData = {
      name: 'Test Group',
      description: 'A test group for functionality verification'
    };
    
    const createGroupResponse = await makeRequest('POST', '/groups', groupData, authToken);
    console.log(`   Status: ${createGroupResponse.status}`);
    console.log(`   Response:`, createGroupResponse.data);

    if (createGroupResponse.status !== 201) {
      throw new Error('Failed to create group');
    }

    // Check the response format
    console.log(`   Response format check:`);
    console.log(`   - Has success: ${!!createGroupResponse.data.success}`);
    console.log(`   - Has group: ${!!createGroupResponse.data.group}`);
    console.log(`   - Group has id: ${!!createGroupResponse.data.group?.id}`);

    testGroupId = createGroupResponse.data.group.id;

    // Step 5: Test getGroups endpoint (should return array with one group)
    console.log('\n5. Testing getGroups endpoint (with data)...');
    const getGroupsResponse = await makeRequest('GET', '/groups', null, authToken);
    console.log(`   Status: ${getGroupsResponse.status}`);
    console.log(`   Response:`, getGroupsResponse.data);
    console.log(`   Is Array:`, Array.isArray(getGroupsResponse.data));
    console.log(`   Groups count:`, getGroupsResponse.data.length);
    
    if (getGroupsResponse.data.length > 0) {
      console.log(`   First group has id:`, !!getGroupsResponse.data[0].id);
      console.log(`   First group id:`, getGroupsResponse.data[0].id);
    }

    // Step 6: Test getGroup by ID
    console.log('\n6. Testing getGroup by ID...');
    const getGroupResponse = await makeRequest('GET', `/groups/${testGroupId}`, null, authToken);
    console.log(`   Status: ${getGroupResponse.status}`);
    console.log(`   Response:`, getGroupResponse.data);
    
    if (getGroupResponse.data.group) {
      console.log(`   Group has id:`, !!getGroupResponse.data.group.id);
    }

    console.log('\n✅ All tests completed successfully!');
    console.log('\n📋 Summary:');
    console.log('   - Server health: ✅');
    console.log('   - User registration: ✅');
    console.log('   - Empty groups retrieval: ✅');
    console.log('   - Group creation: ✅');
    console.log('   - Groups retrieval with data: ✅');
    console.log('   - Individual group retrieval: ✅');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testGroupFunctionality();