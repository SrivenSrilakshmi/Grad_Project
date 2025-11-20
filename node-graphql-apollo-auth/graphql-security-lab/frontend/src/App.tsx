import React, { useState } from 'react';

function buildDeepQuery(depth: number) {
  let q = '';
  for (let i = 0; i < depth; i++) {
    q += `posts { comments { `;
  }
  q += 'id';
  for (let i = 0; i < depth; i++) q += ' } }';
  return `query Deep { ${q} }`;
}

export default function App() {
  const [depth, setDepth] = useState(2);
  const [target, setTarget] = useState<'vulnerable' | 'hardened'>('vulnerable');
  const [response, setResponse] = useState('');

  async function run() {
    const query = buildDeepQuery(depth);
    const url = 'http://localhost:4000/graphql';
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query }) });
    const json = await res.json();
    setResponse(JSON.stringify(json, null, 2));
  }

  return (
    <div style={{ padding: 20, fontFamily: 'Arial, sans-serif' }}>
      <h1>GraphQL Security Lab - Query Builder</h1>
      <label>
        Target:
        <select value={target} onChange={e => setTarget(e.target.value as any)}>
          <option value="vulnerable">Vulnerable</option>
          <option value="hardened">Hardened</option>
        </select>
      </label>
      <div>
        <label>
          Depth: <input type="number" value={depth} min={1} max={20} onChange={e => setDepth(Number(e.target.value))} />
        </label>
        <button onClick={run} style={{ marginLeft: 8 }}>Run Query</button>
      </div>
      <h3>Response</h3>
      <pre style={{ background: '#f7f7f7', padding: 10 }}>{response}</pre>
      <p style={{ color: 'red' }}>Warning: destructive actions are no-op by default in this lab. Use caution.</p>
    </div>
  );
}
