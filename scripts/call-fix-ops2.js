const fixOps2User = async () => {
  try {
    // First, login with a working user to get a token
    console.log('🔐 Logging in to get auth token...');
    const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin',
        budgetYear: '2026-Murni'
      }),
    });

    if (!loginResponse.ok) {
      console.log('❌ Login failed, trying alternative admin credentials...');
      
      // Try alternative admin credentials
      const altLoginResponse = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: 'superadmin',
          password: 'superadmin123',
          budgetYear: '2026-Murni'
        }),
      });
      
      if (!altLoginResponse.ok) {
        console.log('❌ All admin logins failed, trying oper3...');
        
        // Try oper3 as last resort
        const oper3LoginResponse = await fetch('http://localhost:3000/api/auth/login', {
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
        
        if (!oper3LoginResponse.ok) {
          console.log('❌ All login attempts failed');
          return;
        }
        
        const oper3Data = await oper3LoginResponse.json();
        console.log('✅ oper3 login successful');
        callFixEndpoint(oper3Data.token);
        return;
      }
      
      const altData = await altLoginResponse.json();
      console.log('✅ Superadmin login successful');
      callFixEndpoint(altData.token);
      return;
    }

    const loginData = await loginResponse.json();
    console.log('✅ Admin login successful');
    callFixEndpoint(loginData.token);

  } catch (error) {
    console.error('Error:', error);
  }
};

const callFixEndpoint = async (token) => {
  try {
    console.log('🔧 Calling fix ops2 endpoint...');
    const response = await fetch('http://localhost:3000/api/subperangkatdaerah/fix-ops2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({}),
    });

    console.log('Response status:', response.status);
    const data = await response.json();
    console.log('Response data:', data);
    
    if (response.ok) {
      console.log('✅ ops2 user fixed successfully!');
    }
  } catch (error) {
    console.error('Error calling fix endpoint:', error);
  }
};

fixOps2User();