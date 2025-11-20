# Updated Package.json with Research Scripts

Now let me update the package.json to include all the new research and analysis scripts:

```json
{
  "name": "graphql-security-lab",
  "version": "1.0.0",
  "private": true,
  "description": "Comprehensive GraphQL security research and educational platform",
  "keywords": ["graphql", "security", "vulnerabilities", "education", "research"],
  "scripts": {
    "dev:vulnerable": "node servers/vulnerable/src/index.js",
    "dev:vulnerable-ts": "ts-node-dev --respawn --transpile-only servers/vulnerable/src/index.ts",
    "dev:hardened": "node servers/hardened/src/index.js",
    "dev:deep-query-server": "node deep-query-vulnerable-server.js",
    "test": "jest --config jest.config.js --runInBand",
    "test:security": "jest tests/security.test.js --verbose",
    "attack:introspection": "node attacks/introspection-check.js --lab",
    "attack:deep-query": "node attacks/deep-query.js --lab --maxDepth=8",
    "attack:complex-query": "node attacks/complex-query.js --lab --size=100",
    "attack:simulate": "npm run attack:introspection && npm run attack:deep-query",
    "attack:demo": "node full-attack-demo.js",
    "research:assess": "node security-metrics.js",
    "research:assess-hardened": "node security-metrics.js http://localhost:4001/graphql",
    "research:compare": "node comparative-analysis.js",
    "research:report": "node generate-research-data.js",
    "servers:list": "netstat -an | findstr :400",
    "servers:kill": "Get-Process | Where-Object {$_.ProcessName -eq 'node'} | Stop-Process -Force",
    "demo:full": "npm run research:assess && npm run attack:simulate",
    "docs:methodology": "echo 'See METHODOLOGY.md for detailed research methodology'",
    "docs:results": "echo 'See security-assessment-report.md for latest results'"
  },
  "dependencies": {
    "apollo-server-express": "^3.12.0",
    "body-parser": "^1.20.2",
    "cors": "^2.8.5",
    "express": "^4.18.2",
    "express-rate-limit": "^6.10.0",
    "graphql": "^16.7.1",
    "graphql-depth-limit": "^1.1.0",
    "graphql-query-complexity": "^0.8.0",
    "jsonwebtoken": "^9.0.0",
    "node-fetch": "^2.6.7",
    "pg": "^8.11.0",
    "yargs": "^17.7.2",
    "zod": "^3.23.2"
  },
  "devDependencies": {
    "@types/express": "^4.17.17",
    "@types/jest": "^29.5.2",
    "@types/node": "^18.16.18",
    "@types/supertest": "^2.0.12",
    "jest": "^29.5.0",
    "supertest": "^6.3.3",
    "ts-jest": "^29.1.0",
    "ts-node-dev": "^2.0.0",
    "typescript": "^5.4.2"
  },
  "engines": {
    "node": ">=16.0.0",
    "npm": ">=8.0.0"
  },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/yourusername/graphql-security-lab.git"
  },
  "author": "Your Name <your.email@university.edu>",
  "license": "MIT",
  "bugs": {
    "url": "https://github.com/yourusername/graphql-security-lab/issues"
  },
  "homepage": "https://github.com/yourusername/graphql-security-lab#readme"
}
```