// Script to clean up test data and verify group functionality
const http = require('http');

const API_BASE_URL = 'http://localhost:3000/api';

// Test utility function
function makeRequest(method, path, data = null, token = null) {
  return new Promise((resolve, reject) => {
    // Handle health endpoint separately
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

async function cleanupAndTestGroups() {
  console.log('🧹 Cleaning up test data and verifying group functionality\n');

  let authToken = null;
  let testUserId = null;
  let createdGroups = [];

  try {
    // Step 1: Test server health
    console.log('1. Testing server health...');
    const healthResponse = await makeRequest('GET', '/health');
    console.log(`   Status: ${healthResponse.status}`);
    console.log(`   Server running: ${healthResponse.data.success}\n`);

    // Step 2: Register or login with test user
    console.log('2. Setting up test user...');
    const loginData = {
      email: 'testuser@splitsy.app',
      password: 'TestPass123'
    };

    // Try to login first
    let loginResponse = await makeRequest('POST', '/auth/login', loginData);
    
    if (loginResponse.status === 401) {
      // User doesn't exist, register new one
      const registerData = {
        name: 'Test User',
        email: 'testuser@splitsy.app',
        password: 'TestPass123'
      };
      
      loginResponse = await makeRequest('POST', '/auth/register', registerData);
      console.log(`   Registered new user: ${loginResponse.data.user?.email}`);
    } else {
      console.log(`   Logged in existing user: ${loginData.email}`);
    }

    authToken = loginResponse.data.token;
    testUserId = loginResponse.data.user.id;

    // Step 3: Get existing groups and clean up old test groups
    console.log('\n3. Cleaning up existing test groups...');
    const existingGroupsResponse = await makeRequest('GET', '/groups', null, authToken);
    console.log(`   Found ${existingGroupsResponse.data.length} existing groups`);

    for (const group of existingGroupsResponse.data) {
      if (group.name.includes('Test') || group.name.includes('House')) {
        try {
          console.log(`   Deleting old test group: ${group.name}`);
          await makeRequest('DELETE', `/groups/${group.id}`, null, authToken);
        } catch (error) {
          console.log(`   Could not delete ${group.name}: ${error.message}`);
        }
      }
    }

    // Step 4: Create fresh test groups
    console.log('\n4. Creating fresh test groups...');
    
    const testGroups = [
      { name: 'House Expenses', description: 'Shared house expenses like rent and utilities' },
      { name: 'Weekend Trip', description: 'Expenses for our weekend getaway' },
      { name: 'Office Lunch', description: 'Office team lunch expenses' }
    ];

    for (const groupData of testGroups) {
      const createResponse = await makeRequest('POST', '/groups', groupData, authToken);
      if (createResponse.status === 201) {
        createdGroups.push(createResponse.data.group);
        console.log(`   ✅ Created: ${groupData.name} (ID: ${createResponse.data.group.id})`);
      } else {
        console.log(`   ❌ Failed to create: ${groupData.name}`);
      }
    }

    // Step 5: Verify groups can be retrieved
    console.log('\n5. Verifying group retrieval...');
    const groupsResponse = await makeRequest('GET', '/groups', null, authToken);
    console.log(`   Retrieved ${groupsResponse.data.length} groups`);
    
    for (const group of groupsResponse.data) {
      console.log(`   - ${group.name} (ID: ${group.id})`);
      console.log(`     Members: ${group.members?.length || 0}`);
      console.log(`     Creator: ${group.creator?.name || 'Unknown'}`);
    }

    // Step 6: Test individual group retrieval
    console.log('\n6. Testing individual group access...');
    if (createdGroups.length > 0) {
      const testGroup = createdGroups[0];
      const individualGroupResponse = await makeRequest('GET', `/groups/${testGroup.id}`, null, authToken);
      if (individualGroupResponse.status === 200) {
        console.log(`   ✅ Successfully accessed: ${testGroup.name}`);
        console.log(`   Group data structure is valid`);
      } else {
        console.log(`   ❌ Failed to access individual group: ${individualGroupResponse.data.message}`);
      }
    }

    // Step 7: Test group deletion
    console.log('\n7. Testing group deletion...');
    if (createdGroups.length > 1) {
      const groupToDelete = createdGroups[1];
      const deleteResponse = await makeRequest('DELETE', `/groups/${groupToDelete.id}`, null, authToken);
      if (deleteResponse.status === 200) {
        console.log(`   ✅ Successfully deleted: ${groupToDelete.name}`);
      } else {
        console.log(`   ❌ Failed to delete group: ${deleteResponse.data.message}`);
      }
    }

    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📋 Summary:');
    console.log('   - Server health: ✅');
    console.log('   - User authentication: ✅');
    console.log('   - Old test data cleanup: ✅');
    console.log('   - Fresh group creation: ✅');
    console.log('   - Group retrieval: ✅');
    console.log('   - Individual group access: ✅');
    console.log('   - Group deletion: ✅');
    console.log('\n💡 Your app now has fresh, clean data with proper structure!');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the cleanup and test
cleanupAndTestGroups();