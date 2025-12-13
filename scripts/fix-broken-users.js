const fixBrokenUsers = async () => {
  try {
    // First, login with a working user to get a token
    console.log('🔐 Logging in to get auth token...');
    const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'oper3',
        password: '111111',
        budgetYear: '2026-Murni'
      }),
    });

    if (!loginResponse.ok) {
      console.log('❌ Login failed');
      return;
    }

    const loginData = await loginResponse.json();
    console.log('✅ Login successful');
    const token = loginData.token;

    // Fix ops2 user
    console.log('🔧 Fixing ops2 user...');
    const ops2Response = await fetch('http://localhost:3000/api/users/ops2', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        password: '$2a$10$5QNHA8MCykJ15UhiqwN6PedXgQhOS5BJI1N/IDQvWPztlAdtP0sCG'
      }),
    });

    if (ops2Response.ok) {
      console.log('✅ ops2 user fixed successfully');
    } else {
      console.log('❌ Failed to fix ops2 user:', await ops2Response.text());
    }

    // Fix opskedua user
    console.log('🔧 Fixing opskedua user...');
    const opskeduaResponse = await fetch('http://localhost:3000/api/users/opskedua', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        password: '$2a$10$NHmgWzQjxlQlpgK/cJMRp.A5n/TiAX.SWLUfX7sijS20HgkB/By5K'
      }),
    });

    if (opskeduaResponse.ok) {
      console.log('✅ opskedua user fixed successfully');
    } else {
      console.log('❌ Failed to fix opskedua user:', await opskeduaResponse.text());
    }

    console.log('🎉 All users fixed!');

  } catch (error) {
    console.error('Error:', error);
  }
};

fixBrokenUsers();