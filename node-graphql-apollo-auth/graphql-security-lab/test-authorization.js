const GraphGuard = require('./graphguard/graphGuard');

// Initialize GraphGuard with field permissions
const graphGuard = new GraphGuard({
  maxDepth: 10,
  maxComplexity: 2000,
  maxAliases: 30,
  enableIntrospection: true,
  enableLogging: false,
  fieldPermissions: {
    // Payment-related fields require admin role
    'billingToken': ['admin'],
    'paymentDetails': ['admin'],
    'creditCard': ['admin'],
    'bankAccount': ['admin'],
    
    // User management requires admin
    'deleteUser': ['admin'],
    'adminPanel': ['admin'],
    
    // Regular fields accessible to standard users
    'orders': ['user', 'admin'],
    'profile': ['user', 'admin']
  },
  roles: {
    anonymous: 0,
    user: 1,
    admin: 2
  }
});

// Test query attempting to access unauthorized field
const unauthorizedQuery = `
  query {
    user(id: "23") {
      orders {
        paymentDetails {
          billingToken
        }
      }
    }
  }
`;

console.log('\n┌─────────────────────────────────────────────────────────┐');
console.log('│     GraphGuard Authorization Path Validator Demo       │');
console.log('└─────────────────────────────────────────────────────────┘\n');

console.log('📋 Client Query:');
console.log(unauthorizedQuery);

console.log('\n                     ▼');
console.log(' ┌─────────────────────────────────────────────────────────┐');
console.log(' │        GraphGuard Authorization Path Validator          │');
console.log(' └─────────────────────────────────────────────────────────┘');
console.log('                     ▼\n');

// Create mock request with standard user
const mockReq = {
  body: { query: unauthorizedQuery },
  headers: { 'user-agent': 'test-client' },
  ip: '127.0.0.1',
  user: {
    id: '23',
    role: 'user',  // Standard user trying to access admin-only field
    username: 'standard_user'
  }
};

const mockRes = {
  statusCode: null,
  responseData: null,
  status: function(code) {
    this.statusCode = code;
    return this;
  },
  json: function(data) {
    this.responseData = data;
    return this;
  }
};

const mockNext = () => {};

// Execute middleware
graphGuard.middleware()(mockReq, mockRes, mockNext);

// Display results
if (mockRes.statusCode === 400) {
  const error = mockRes.responseData.errors[0];
  const violations = error.extensions.violations;
  const authViolation = violations.find(v => v.type === 'UNAUTHORIZED_ACCESS');
  
  if (authViolation) {
    const unauthorizedField = authViolation.fields[0];
    const fieldName = unauthorizedField.field || unauthorizedField;
    
    console.log('   📊 Path Evaluation Result: \x1b[31mACCESS DENIED\x1b[0m');
    console.log(`   Reason: Role "${mockReq.user.username}" lacks permission for "${fieldName}"`);
    console.log(`   Risk Score: ${error.extensions.riskScore}`);
    console.log(`   Violation Type: ${authViolation.type}`);
  } else {
    console.log('   📊 Path Evaluation Result: \x1b[31mBLOCKED\x1b[0m');
    console.log(`   Reason: ${violations[0].type}`);
    console.log(`   Risk Score: ${error.extensions.riskScore}`);
  }
  
  console.log('\n                     ▼');
  console.log(' 🛡️  Server Response:');
  console.log('   {');
  console.log('     "errors": [');
  console.log('        {');
  console.log(`          "message": "Unauthorized access path detected.",`);
  console.log(`          "status": "ACCESS_DENIED",`);
  console.log(`          "extensions": {`);
  console.log(`            "code": "${error.extensions.code}",`);
  console.log(`            "reason": "${error.extensions.reason}",`);
  console.log(`            "riskScore": ${error.extensions.riskScore}`);
  
  if (authViolation && authViolation.fields.length > 0) {
    const field = authViolation.fields[0];
    console.log(`            "unauthorizedField": "${field.field || field}",`);
    console.log(`            "requiredRoles": ${JSON.stringify(field.requiredRoles || ['admin'])},`);
    console.log(`            "userRole": "${field.userRole || mockReq.user.role}"`);
  }
  
  console.log(`          }`);
  console.log('        }');
  console.log('     ]');
  console.log('   }');
} else {
  console.log('   ✅ Query ALLOWED - User has proper permissions');
}

console.log('\n═══════════════════════════════════════════════════════════\n');

// Now test with admin user
console.log('🔄 Testing same query with ADMIN role...\n');

mockReq.user.role = 'admin';
mockReq.user.username = 'admin_user';

const mockRes2 = {
  statusCode: null,
  responseData: null,
  status: function(code) {
    this.statusCode = code;
    return this;
  },
  json: function(data) {
    this.responseData = data;
    return this;
  }
};

graphGuard.middleware()(mockReq, mockRes2, mockNext);

if (mockRes2.statusCode === 400) {
  console.log('   ❌ Query BLOCKED');
} else {
  console.log('   ✅ Query ALLOWED - Admin has access to billingToken field');
  console.log('   📊 Authorization: GRANTED');
  console.log('   Role: admin');
  console.log('   Permission Level: 2 (required: 2)');
}

console.log('\n═══════════════════════════════════════════════════════════\n');
console.log('✨ GraphGuard Authorization Path Validator - Protecting sensitive fields!\n');
