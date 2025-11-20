# 🎬 Demo Checklist for Professor Presentation

## Pre-Demo Setup (5 minutes before)

### ✅ Environment Check
- [ ] Navigate to lab directory: `cd "c:\Users\srive\OneDrive\Grad Projecy\node-graphql-apollo-auth\graphql-security-lab"`
- [ ] Verify dependencies: `npm list` (should show installed packages)
- [ ] Open 2-3 PowerShell terminals

### ✅ Server Startup
- [ ] **Terminal 1**: Start vulnerable server
  ```powershell
  npm run dev:vulnerable
  ```
  Expected output: `VULNERABLE server running at http://localhost:4000/graphql`

- [ ] **Terminal 2**: Keep ready for attack commands
- [ ] **Optional Terminal 3**: For hardened server (if fixed)

## 🎯 Demo Flow (15-20 minutes)

### **Opening** (2 min)
**Say**: "GraphQL security is critical in modern applications. I've built a comprehensive lab to demonstrate real vulnerabilities and their mitigations."

**Show**: 
- Browser: `http://localhost:4000/graphql` (GraphQL Playground)
- Project structure in VS Code

### **Vulnerability Demo 1: Introspection** (3 min)
**Command**:
```powershell
node attacks/introspection-check.js --lab
```

**Expected Output**: "Introspection available: schema types count = [number]"

**Explain**: "In production, this exposes your entire API structure to attackers."

### **Vulnerability Demo 2: Deep Query Attack** (4 min)
**Commands** (run progressively):
```powershell
# Start small
node attacks/deep-query.js --lab --maxDepth=3

# Increase complexity
node attacks/deep-query.js --lab --maxDepth=6

# Show potential impact
node attacks/deep-query.js --lab --maxDepth=10
```

**Explain**: "Each level multiplies the work exponentially. Without limits, this can crash servers."

### **Vulnerability Demo 3: Complexity Attack** (3 min)
**Command**:
```powershell
node attacks/complex-query.js --lab --size=50
```

**Explain**: "By aliasing the same field many times, attackers multiply processing time."

### **Code Review** (4 min)
**Show in VS Code**:
1. `servers/vulnerable/src/index.ts` - point out missing security
2. `servers/vulnerable/src/resolvers.ts` - highlight missing auth
3. `servers/hardened/src/index.ts` - show security measures

**Key Code to Highlight**:
```typescript
// VULNERABLE - Bad
const server = new ApolloServer({
  introspection: true,  // ❌ Always exposed
  // ❌ No validation rules
});

// HARDENED - Good  
const server = new ApolloServer({
  introspection: process.env.NODE_ENV !== 'production', // ✅
  validationRules: [depthLimit(5)], // ✅ Protection
});
```

### **Testing & Validation** (2 min)
**Command**:
```powershell
npm test
```

**Explain**: "Automated tests validate that security measures work correctly."

### **Wrap-up** (2 min)
**Key Points**:
- GraphQL needs specialized security measures
- Defense-in-depth approach is essential
- Automated testing ensures ongoing protection

## 🚨 Backup Plans

### If Vulnerable Server Won't Start:
1. Show the code instead
2. Explain what would happen
3. Use browser GraphQL Playground to demonstrate queries manually

### If Attack Scripts Fail:
1. Show the script code
2. Explain the attack concept
3. Demonstrate with manual GraphQL queries

### If Everything Breaks:
1. Focus on code walkthrough
2. Explain architectural decisions
3. Discuss real-world examples (GitHub, Shopify)

## 📝 Key Talking Points

### **Technical Complexity**:
- "This isn't just a simple script - it's a full production-style implementation"
- "Used industry-standard libraries like Apollo Server and security middleware"
- "Includes comprehensive testing and documentation"

### **Real-World Relevance**:
- "These exact vulnerabilities affect major APIs like GitHub's GraphQL API"
- "Companies like Shopify have documented DoS attacks from unlimited queries"
- "The mitigations I implemented are used in production by major tech companies"

### **Educational Value**:
- "Students can safely experiment with real attacks"
- "Side-by-side comparison makes the security impact clear"
- "Extensible for additional research and learning"

## 🎯 Success Indicators

### **Professor Should See**:
- [ ] Working vulnerable server with GraphQL Playground
- [ ] Attack scripts producing expected output
- [ ] Clear before/after code comparison
- [ ] Professional documentation and structure
- [ ] Understanding of real-world security implications

### **Impressive Details to Mention**:
- [ ] "Lab includes safety checks - won't work against external servers"
- [ ] "Attack scripts require explicit --lab flag for ethical usage"
- [ ] "Comprehensive test suite validates security measures"
- [ ] "Docker integration for realistic deployment scenarios"
- [ ] "Frontend interface for interactive vulnerability exploration"

## 🔧 Emergency Commands

### Quick Server Check:
```powershell
# Verify server is running
curl http://localhost:4000/graphql
```

### Package Status:
```powershell
# Check if all deps installed correctly
npm list --depth=0
```

### Alternative Demo:
If servers fail, demonstrate with online GraphQL examples:
- Show GitHub GraphQL Explorer
- Explain how rate limiting works there
- Discuss real vulnerability disclosures