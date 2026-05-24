interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface McpToolExport {
  tools: McpToolDefinition[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  meter?: { credits: number };
  cost?: Record<string, unknown>;
  provider?: string;
}

/**
 * Bandsintown MCP.
 */


const BASE = 'https://rest.bandsintown.com';
const UA = 'pipeworx-mcp-bandsintown/1.0 (+https://pipeworx.io)';

const tools: McpToolExport['tools'] = [
  { name: 'artist', description: 'Artist profile.', inputSchema: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] } },
  {
    name: 'artist_events',
    description: 'Upcoming events for an artist.',
    inputSchema: { type: 'object', properties: { name: { type: 'string' }, date: { type: 'string' } }, required: ['name'] },
  },
  {
    name: 'events',
    description: 'Global events filter.',
    inputSchema: { type: 'object', properties: { date: { type: 'string' }, location: { type: 'string' }, radius: { type: 'number' }, page: { type: 'number' } } },
  },
];

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  const apiKey = (args._apiKey as string | undefined)?.trim();
  if (!apiKey) throw new Error('Bandsintown requires an app_id. Set PLATFORM_BANDSINTOWN_KEY or pass ?_apiKey=… (any unique string, register at https://www.artists.bandsintown.com/support/api-installation).');
  const get = async (path: string, extra?: Record<string, unknown>) => {
    const p = new URLSearchParams({ app_id: apiKey });
    if (extra) for (const [k, v] of Object.entries(extra)) if (v != null) p.set(k, String(v));
    const res = await fetch(`${BASE}${path}?${p}`, { headers: { Accept: 'application/json', 'User-Agent': UA } });
    if (res.status === 401 || res.status === 403) throw new Error('Bandsintown: invalid app_id.');
    if (res.status === 404) throw new Error('Bandsintown: 404 — artist not found.');
    if (!res.ok) throw new Error(`Bandsintown: ${res.status}`);
    return res.json();
  };
  const reqStr = (k: string, ex: string) => {
    const v = args[k];
    if (typeof v !== 'string' || !v.trim()) throw new Error(`Required argument "${k}" is missing. Pass a string like ${ex}.`);
    return v;
  };
  switch (name) {
    case 'artist':
      return get(`/artists/${encodeURIComponent(reqStr('name', '"Coldplay"'))}`);
    case 'artist_events':
      return get(`/artists/${encodeURIComponent(reqStr('name', '"Coldplay"'))}/events`, { date: args.date });
    case 'events':
      return get('/events', { date: args.date, location: args.location, radius: args.radius, page: args.page });
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

export default { tools, callTool, meter: { credits: 1 } } satisfies McpToolExport;
