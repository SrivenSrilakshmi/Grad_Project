# GraphQL Security Lab

This repository is a self-contained, lab-only GraphQL security training environment. It includes a deliberately vulnerable server and a hardened server so you can  attack and mitigations safely on localhost.

Lab safety: Run only in an isolated environment (local VM or sandbox). Do NOT expose this to public networks or use against external services.

Quick start

1. Install dependencies:

   npm install

2. Start the vulnerable server:

   npm run dev:vulnerable

3. In a separate terminal, run the hardened server:

   npm run dev:hardened

4. Run attack simulations (lab-only):

   npm run attack:simulate

Project layout

- servers/vulnerable : intentionally insecure GraphQL server
- servers/hardened   : same schema but with mitigations (depth limit, complexity analysis, auth, validation)
- attacks/           : non-destructive attack simulation scripts (require --lab flag)
- frontend/          : minimal React UI with Query Builder
- docker-compose.yml : local Postgres service (optional)

Vulnerability matrix

- No depth limit (vulnerable) -> Apply graphql-depth-limit (hardened)
- No complexity analysis -> Apply graphql-query-complexity
- Introspection enabled in production -> Disable introspection in production builds
- Raw SQL string concatenation -> Use parameterized queries / ORM (Prisma, Knex)
- Missing resolver-level auth (deleteUser/postsByEmail) -> Add auth checks and role checks
- No input validation -> Use zod/joi to validate inputs
- No rate limiting -> express-rate-limit or Apollo plugins

Ethics & Legal

This code is provided for defensive research and training in controlled environments only. Do not use the attack scripts or vulnerabilities to target any systems you do not own or have explicit permission to test. By using this repository you agree to follow all applicable laws and your organization's policies.
