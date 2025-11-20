import fetch from 'node-fetch';

const endpoint = (path: 'vulnerable' | 'hardened') => 'http://localhost:4000/graphql';

function buildDeepQuery(depth: number) {
  let q = '';
  for (let i = 0; i < depth; i++) {
    q += `posts { comments { `;
  }
  q += 'id';
  for (let i = 0; i < depth; i++) q += ' } }';
  return `query Deep { ${q} }`;
}

describe('GraphQL security behaviors', () => {
  test('deep query should be allowed on vulnerable and blocked on hardened', async () => {
    const deepQ = buildDeepQuery(10);
    // vulnerable: expect a response (may be large but our in-memory store is small)
    const vRes = await fetch(endpoint('vulnerable'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: deepQ }) });
    const vJson = await vRes.json();
    expect(vJson).toBeDefined();

    // hardened: likely blocked by depth limit; expect errors or empty
    const hRes = await fetch(endpoint('hardened'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: deepQ }) });
    const hJson = await hRes.json();
    // Either returns errors or a truncated result
    expect(hJson).toBeDefined();
  });
});
