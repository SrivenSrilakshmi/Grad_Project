# 🛡️ GraphQL Security Research & Authentication Project

## Overview

This project is a comprehensive GraphQL security research initiative that demonstrates both **vulnerable** and **hardened** GraphQL server implementations. It serves as an educational tool and security assessment framework for understanding GraphQL vulnerabilities and implementing enterprise-grade security measures.

## 🎯 Project Goals

- **Security Research**: Analyze common GraphQL vulnerabilities and attack vectors
- **Defense Implementation**: Showcase enterprise-grade security controls and best practices  
- **Educational Value**: Provide hands-on learning for GraphQL security concepts
- **Production Readiness**: Demonstrate deployment-ready secure GraphQL implementations

## 🔥 Key Features

### 🛡️ **Hardened Server (Production-Ready)**
- **GraphGuard AI Security**: Intelligent query analysis with dynamic risk scoring
- **Authentication & Authorization**: JWT-based with role-based access control (RBAC)
- **Query Protection**: Depth limiting (7 levels) and complexity analysis (300 cost limit)
- **Input Security**: Zod schema validation with XSS protection and sanitization
- **Rate Limiting**: Express-level protection (100 requests/15min)
- **Production Hardening**: Introspection disabled, error sanitization, CORS configuration

### ⚠️ **Vulnerable Server (Educational)**
- **Exposed Introspection**: Full schema exposure for reconnaissance attacks
- **No Query Limits**: Unlimited depth and complexity for DoS demonstrations
- **Missing Authentication**: Unprotected endpoints and data exposure
- **Input Vulnerabilities**: No validation, sanitization, or injection protection
- **Information Leakage**: Detailed error messages and stack traces

### 🧪 **Comprehensive Testing Suite**
- **Attack Simulations**: Introspection, alias flooding, deep nesting, complexity attacks
- **Security Verification**: Automated testing of all security controls
- **Performance Analysis**: Query complexity and resource consumption metrics
- **Comparison Testing**: Side-by-side vulnerable vs hardened server analysis

## 📁 Project Structure

```
node-graphql-apollo-auth/
├── 🔬 graphql-security-lab/              # Main security research lab
│   ├── 🛡️ servers/
│   │   ├── hardened/                     # Production-ready secure server
│   │   │   └── src/
│   │   │       ├── index.js              # Main hardened server implementation
│   │   │       └── resolvers.ts          # Secure resolvers with auth
│   │   ├── vulnerable/                   # Intentionally vulnerable server
│   │   │   └── src/
│   │   │       ├── index.js              # Vulnerable server for testing
│   │   │       └── resolvers.js          # Unprotected resolvers
│   │   └── common/
│   │       └── schema/                   # Shared GraphQL schema
│   │           ├── typeDefs.js
│   │           └── typeDefs.ts
│   ├── 🔍 graphguard/
│   │   └── graphGuard.js                 # AI-powered security middleware
│   ├── ⚔️ attacks/                        # Attack demonstration scripts
│   │   ├── alias-flood.js                # Alias flooding attack
│   │   ├── deep-query.js                 # Deep nesting attack
│   │   ├── complex-query.js              # Complexity attack
│   │   └── introspection-check.js        # Schema introspection
│   ├── 🧪 tests/
│   │   ├── security.test.js              # Security test suite
│   │   └── integration/
│   │       └── security.test.ts          # Integration tests
│   ├── 📊 Verification & Reports
│   │   ├── comprehensive-hardened-verification.js
│   │   ├── test-graphguard.js
│   │   └── HARDENED_SERVER_VERIFICATION_REPORT.md
│   └── 📋 Documentation
│       ├── RESEARCH_PAPER.md             # Academic research findings
│       ├── TECHNICAL_SUMMARY.md          # Technical implementation guide
│       ├── METHODOLOGY.md                # Research methodology
│       └── security-assessment-report.md # Security assessment results
├── 🏗️ src/                               # Original authentication server
│   ├── app.ts
│   ├── server.ts
│   ├── schema/
│   │   ├── typeDefs.ts
│   │   └── resolvers.ts
│   ├── modules/user/
│   │   ├── user.model.ts
│   │   ├── user.resolvers.ts
│   │   └── user.types.ts
│   ├── auth/
│   │   ├── jwt.ts
│   │   ├── auth.middleware.ts
│   │   └── roles.ts
│   └── middleware/
│       ├── validation.middleware.ts
│       ├── depthLimit.middleware.ts
│       └── costAnalysis.middleware.ts
└── 🧪 tests/
    ├── integration/auth.test.ts
    └── unit/validators.test.ts
```

## 🚀 Quick Start

### Prerequisites
- Node.js (v14+ recommended)
- npm or yarn package manager

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd node-graphql-apollo-auth
   ```

2. **Install dependencies:**
   ```bash
   # Install main project dependencies
   npm install
   
   # Install security lab dependencies
   cd graphql-security-lab
   npm install
   cd ..
   ```

3. **Environment setup:**
   ```bash
   # Create environment file (optional - defaults provided)
   cp .env.example .env
   ```

## 🏃‍♂️ Running the Servers

### Option 1: Security Lab (Recommended)
```bash
cd graphql-security-lab

# Start both servers simultaneously
npm run start:all

# Or start individually:
npm run start:vulnerable    # Port 4000 - Vulnerable server
npm run start:hardened     # Port 4001 - Hardened server
```

### Option 2: Original Authentication Server
```bash
# From root directory
npm start                  # Port 4000 - Original server
```

## 🔗 Server Endpoints

| Server | URL | Purpose |
|--------|-----|---------|
| **Hardened** | http://localhost:4001/graphql | 🛡️ Production-ready secure server |
| **Vulnerable** | http://localhost:4000/graphql | ⚠️ Educational vulnerable server |
| **Original** | http://localhost:4000/graphql | 🏗️ Basic authentication server |

## 🧪 Testing & Verification

### Security Verification Suite
```bash
cd graphql-security-lab

# Comprehensive security verification
node comprehensive-hardened-verification.js

# GraphGuard specific tests
node test-graphguard.js

# Individual attack demonstrations
node attacks/introspection-check.js
node attacks/alias-flood.js
node attacks/deep-query.js
```

### Attack Simulations
```bash
# Run various attack scenarios
node vulnerable-demo-server.js      # Vulnerable server attacks
node hardened-server-demo.js full   # Hardened server protection demo
```

### Automated Test Suite
```bash
# Run security tests
npm test

# Run integration tests
npm run test:integration

# Run all tests with coverage
npm run test:coverage
```

## 🔐 Authentication Testing

The hardened server includes JWT-based authentication. Use these test tokens:

### Sample JWT Tokens
```javascript
// User Token (Role: user, ID: 1)
const userToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxIiwiaWF0IjoxNjAwMDAwMDAwfQ.example";

// Admin Token (Role: admin, ID: 3)  
const adminToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIzIiwiaWF0IjoxNjAwMDAwMDAwfQ.example";
```

### Using Authentication
```bash
# Add to request headers:
Authorization: Bearer <token>
```

## 📊 Security Features Comparison

| Feature | Vulnerable Server | Hardened Server |
|---------|-------------------|-----------------|
| **Introspection** | ❌ Fully exposed | ✅ GraphGuard blocked |
| **Query Depth** | ❌ Unlimited | ✅ Limited to 7 levels |
| **Query Complexity** | ❌ No limits | ✅ Max 300 cost units |
| **Authentication** | ❌ None | ✅ JWT-based |
| **Authorization** | ❌ None | ✅ Role-based (RBAC) |  
| **Input Validation** | ❌ None | ✅ Zod schemas |
| **Rate Limiting** | ❌ None | ✅ 100 req/15min |
| **XSS Protection** | ❌ None | ✅ Script sanitization |
| **Error Handling** | ❌ Full stack traces | ✅ Production sanitized |

## 📚 Documentation

- 📋 [**Research Paper**](graphql-security-lab/RESEARCH_PAPER.md) - Academic findings and analysis
- 🔧 [**Technical Summary**](graphql-security-lab/TECHNICAL_SUMMARY.md) - Implementation guide
- 📊 [**Security Assessment**](graphql-security-lab/security-assessment-report.md) - Vulnerability analysis
- 🛡️ [**Verification Report**](graphql-security-lab/HARDENED_SERVER_VERIFICATION_REPORT.md) - Security verification results
- 📖 [**Methodology**](graphql-security-lab/METHODOLOGY.md) - Research approach

## 🎓 Educational Use

This project is designed for:
- **Security Education**: Understanding GraphQL vulnerabilities
- **Best Practices**: Learning secure GraphQL implementation
- **Research**: Analyzing attack vectors and defense mechanisms
- **Training**: Hands-on security testing and verification

## 🤝 Contributing

Contributions are welcome! Areas of interest:
- Additional attack vectors and demonstrations
- Enhanced security controls and middleware
- Performance optimization and benchmarking
- Documentation improvements and tutorials

Please open an issue or submit a pull request.

## 📄 License

This project is licensed under the MIT License. See LICENSE file for details.

## ⭐ Acknowledgments

- GraphQL security research community
- Apollo Server and GraphQL ecosystem
- Security testing frameworks and tools