/**
 * Aegis REST API Live Inspector & Interactive Tester
 */

import React, { useState } from 'react';
import {
  Server,
  Play,
  Copy,
  Check,
  Code2,
  Terminal,
  ExternalLink,
  ShieldCheck,
  Send,
  AlertCircle,
} from 'lucide-react';
import { Registry } from '../types';

interface ApiConsoleProps {
  registry: Registry | null;
}

interface EndpointPreset {
  name: string;
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  path: (regId: string) => string;
  body?: (regId: string) => string;
  description: string;
}

export const ApiConsole: React.FC<ApiConsoleProps> = ({ registry }) => {
  const regId = registry?.id || '2a1b3c4d-1111-4444-8888-000000000001';

  const presets: EndpointPreset[] = [
    {
      name: 'GET /health (Liveness Probe)',
      method: 'GET',
      path: () => '/health',
      description: 'Health check probe for aegis-srv container.',
    },
    {
      name: 'GET /api/registries (List All)',
      method: 'GET',
      path: () => '/api/registries',
      description: 'List all state machine registries ordered by creation date.',
    },
    {
      name: `GET /api/registries/${regId.slice(0, 8)}... (Get Registry)`,
      method: 'GET',
      path: (id) => `/api/registries/${id}`,
      description: 'Fetch specific registry by RFC 4122 UUID.',
    },
    {
      name: `POST /api/registries/:id/validate (Structural Validation)`,
      method: 'POST',
      path: (id) => `/api/registries/${id}/validate`,
      body: () => JSON.stringify({ validated_by: 'aegis-api-tester' }, null, 2),
      description: 'Run lightweight structural validation and save to aegis.validation_result.',
    },
    {
      name: `POST /api/registries/:id/model-check (TLC Model Check)`,
      method: 'POST',
      path: (id) => `/api/registries/${id}/model-check`,
      body: () => JSON.stringify({ checked_by: 'devops-tlc-runner' }, null, 2),
      description: 'Authoritative model check using real TLC or deterministic state-space engine.',
    },
    {
      name: `GET /api/registries/:id/states (List States)`,
      method: 'GET',
      path: (id) => `/api/registries/${id}/states`,
      description: 'Fetch all states defined in this registry.',
    },
    {
      name: `POST /api/registries/:id/states (Create State)`,
      method: 'POST',
      path: (id) => `/api/registries/${id}/states`,
      body: () =>
        JSON.stringify(
          {
            name: 'NEW_STATE',
            description: 'Created via Aegis REST API',
            is_initial: false,
            is_terminal: false,
            variable_assignments: { status: 'STANDBY' },
          },
          null,
          2
        ),
      description: 'Create a new state in the registry.',
    },
    {
      name: `GET /api/registries/:id/transitions (List Transitions)`,
      method: 'GET',
      path: (id) => `/api/registries/${id}/transitions`,
      description: 'Fetch transitions scoped under the parent registry.',
    },
    {
      name: `GET /api/registries/:id/invariants (List Invariants)`,
      method: 'GET',
      path: (id) => `/api/registries/${id}/invariants`,
      description: 'Fetch formal invariants to verify with TLC.',
    },
    {
      name: `GET /api/registries/:id/execution-log (List Logs)`,
      method: 'GET',
      path: (id) => `/api/registries/${id}/execution-log`,
      description: 'Fetch state machine audit transition logs.',
    },
    {
      name: `DELETE /api/registries/:id (Soft-Delete Registry)`,
      method: 'DELETE',
      path: (id) => `/api/registries/${id}`,
      description: 'Soft-delete a registry (sets is_active = false).',
    },
  ];

  const [selectedPreset, setSelectedPreset] = useState<number>(0);
  const [customMethod, setCustomMethod] = useState<'GET' | 'POST' | 'PATCH' | 'DELETE'>('GET');
  const [customPath, setCustomPath] = useState<string>('/health');
  const [requestBody, setRequestBody] = useState<string>('');
  const [responseStatus, setResponseStatus] = useState<number | null>(null);
  const [responseHeaders, setResponseHeaders] = useState<Record<string, string>>({});
  const [responseBody, setResponseBody] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);

  // Apply preset
  const handleSelectPreset = (idx: number) => {
    setSelectedPreset(idx);
    const p = presets[idx];
    setCustomMethod(p.method);
    setCustomPath(p.path(regId));
    setRequestBody(p.body ? p.body(regId) : '');
  };

  // Run Request
  const handleExecute = async () => {
    setLoading(true);
    setResponseStatus(null);
    setResponseBody('');

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    try {
      const startTime = performance.now();
      const res = await fetch(customPath, {
        method: customMethod,
        headers,
        body: customMethod !== 'GET' && requestBody.trim() ? requestBody : undefined,
      });

      const elapsed = Math.round(performance.now() - startTime);
      setResponseStatus(res.status);

      const hdrs: Record<string, string> = {};
      res.headers.forEach((val, key) => {
        hdrs[key] = val;
      });
      hdrs['x-response-time'] = `${elapsed}ms`;
      setResponseHeaders(hdrs);

      const text = await res.text();
      try {
        const json = JSON.parse(text);
        setResponseBody(JSON.stringify(json, null, 2));
      } catch {
        setResponseBody(text);
      }
    } catch (err: unknown) {
      setResponseStatus(500);
      setResponseBody(JSON.stringify({ error: 'Network Error', message: (err as Error).message }, null, 2));
    } finally {
      setLoading(false);
    }
  };

  // Generate Curl
  const curlCmd = `curl -X ${customMethod} http://localhost:3116${customPath} \\
  -H 'Content-Type: application/json'${
    customMethod !== 'GET' && requestBody.trim() ? ` \\\n  -d '${requestBody.replace(/\n/g, '')}'` : ''
  }`;

  const handleCopyCurl = () => {
    navigator.clipboard.writeText(curlCmd);
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
  };

  return (
    <div className="h-full overflow-y-auto bg-[#0F1115] p-6 text-[#C9D1D9]">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Banner */}
        <div className="bg-[#16191E] rounded-xl border border-[#2D333B] p-6 shadow-sm flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <span className="p-1.5 bg-[#3B82F6]/10 text-[#3B82F6] rounded-lg border border-[#3B82F6]/30">
                <Server className="w-5 h-5" />
              </span>
              <h2 className="text-lg font-bold text-[#F0F6FC] tracking-tight">
                Aegis REST API Console & Specification
              </h2>
            </div>
            <p className="text-xs text-[#8B949E] mt-1">
              Test live aegis-srv endpoints on port 3116 / 3000. All child resources are registry-scoped under{' '}
              <code className="bg-[#0F1115] px-1.5 py-0.5 rounded border border-[#2D333B] text-[#58a6ff] font-mono">/api/registries/:id/&lt;resource&gt;</code>.
            </p>
          </div>

          <a
            href="/api/openapi.yaml"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold text-[#58a6ff] bg-[#3B82F6]/15 hover:bg-[#3B82F6]/25 border border-[#3B82F6]/30 rounded-lg transition-colors"
          >
            <Code2 className="w-4 h-4" />
            <span>OpenAPI Spec (YAML)</span>
            <ExternalLink className="w-3 h-3 ml-1" />
          </a>
        </div>

        {/* Tester Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Preset Endpoints Selector */}
          <div className="lg:col-span-4 bg-[#16191E] rounded-xl border border-[#2D333B] shadow-sm p-4 space-y-3">
            <h3 className="font-bold text-xs text-[#F0F6FC] uppercase tracking-wider pb-2 border-b border-[#2D333B]">
              API Endpoints ({presets.length})
            </h3>

            <div className="space-y-1 max-h-[500px] overflow-y-auto pr-1">
              {presets.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectPreset(idx)}
                  className={`w-full text-left p-2.5 rounded-lg border text-xs transition-all ${
                    selectedPreset === idx
                      ? 'bg-[#3B82F6]/15 border-[#3B82F6]/50 text-[#F0F6FC] font-semibold'
                      : 'bg-[#0F1115] border-[#2D333B] hover:bg-[#1C2128] text-[#C9D1D9]'
                  }`}
                >
                  <div className="flex items-center space-x-2 mb-1">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border ${
                        p.method === 'GET'
                          ? 'bg-[#388bfd]/20 text-[#58a6ff] border-[#388bfd]/30'
                          : p.method === 'POST'
                          ? 'bg-[#238636]/20 text-[#3fb950] border-[#238636]/30'
                          : p.method === 'PATCH'
                          ? 'bg-[#d29922]/20 text-[#d29922] border-[#d29922]/30'
                          : 'bg-[#f85149]/20 text-[#f85149] border-[#f85149]/30'
                      }`}
                    >
                      {p.method}
                    </span>
                    <span className="truncate font-mono text-[11px]">{p.path(regId)}</span>
                  </div>
                  <p className="text-[11px] text-[#8B949E] font-normal truncate">{p.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Request & Response Panel */}
          <div className="lg:col-span-8 space-y-4">
            {/* Request Builder */}
            <div className="bg-[#16191E] rounded-xl border border-[#2D333B] shadow-sm p-5 space-y-4">
              <div className="flex items-center space-x-2">
                <select
                  value={customMethod}
                  onChange={(e) => setCustomMethod(e.target.value as any)}
                  className="bg-[#0F1115] border border-[#2D333B] rounded-lg px-3 py-2 text-xs font-bold text-[#F0F6FC] font-mono focus:outline-none focus:border-[#3B82F6]"
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PATCH">PATCH</option>
                  <option value="DELETE">DELETE</option>
                </select>

                <input
                  type="text"
                  value={customPath}
                  onChange={(e) => setCustomPath(e.target.value)}
                  className="flex-1 bg-[#0F1115] border border-[#2D333B] rounded-lg px-3.5 py-2 text-xs font-mono text-[#F0F6FC] placeholder-[#8B949E] focus:outline-none focus:border-[#3B82F6]"
                  placeholder="/api/registries"
                />

                <button
                  onClick={handleExecute}
                  disabled={loading}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#238636] hover:bg-[#2ea043] rounded-lg shadow-sm shadow-[#238636]/30 transition-colors disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{loading ? 'Sending...' : 'Send Request'}</span>
                </button>
              </div>

              {/* Request Body (for POST/PATCH) */}
              {customMethod !== 'GET' && customMethod !== 'DELETE' && (
                <div>
                  <label className="text-xs font-semibold text-[#8B949E] mb-1 block">
                    Request JSON Body
                  </label>
                  <textarea
                    rows={4}
                    value={requestBody}
                    onChange={(e) => setRequestBody(e.target.value)}
                    className="w-full p-2.5 bg-[#0F1115] text-[#C9D1D9] rounded-lg font-mono text-xs border border-[#2D333B] focus:outline-none focus:border-[#3B82F6]"
                    placeholder="{ ... }"
                  />
                </div>
              )}

              {/* Curl command snippet */}
              <div className="pt-2 border-t border-[#2D333B] flex items-center justify-between">
                <span className="text-[11px] text-[#8B949E] font-mono truncate max-w-md">
                  {curlCmd.split('\n')[0]}...
                </span>
                <button
                  onClick={handleCopyCurl}
                  className="inline-flex items-center space-x-1 text-xs text-[#8B949E] hover:text-[#58a6ff] font-medium"
                >
                  {copiedCurl ? <Check className="w-3.5 h-3.5 text-[#3fb950]" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCurl ? 'Copied Curl' : 'Copy cURL'}</span>
                </button>
              </div>
            </div>

            {/* Response Viewer */}
            <div className="bg-[#16191E] rounded-xl border border-[#2D333B] shadow-lg p-5 space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-[#2D333B] text-[#8B949E]">
                <div className="flex items-center space-x-3">
                  <span className="text-[#F0F6FC]">HTTP Response</span>
                  {responseStatus !== null && (
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                        responseStatus >= 200 && responseStatus < 300
                          ? 'bg-[#238636]/20 text-[#3fb950] border-[#238636]/40'
                          : responseStatus >= 400 && responseStatus < 500
                          ? 'bg-[#d29922]/20 text-[#d29922] border-[#d29922]/40'
                          : 'bg-[#f85149]/20 text-[#f85149] border-[#f85149]/40'
                      }`}
                    >
                      {responseStatus} {responseStatus === 200 ? 'OK' : responseStatus === 201 ? 'Created' : ''}
                    </span>
                  )}
                  {responseHeaders['x-response-time'] && (
                    <span className="text-[#8B949E] text-[11px]">
                      {responseHeaders['x-response-time']}
                    </span>
                  )}
                </div>

                <button
                  onClick={() => navigator.clipboard.writeText(responseBody)}
                  disabled={!responseBody}
                  className="text-[#8B949E] hover:text-[#C9D1D9] text-xs disabled:opacity-30"
                >
                  Copy Response
                </button>
              </div>

              <pre className="text-[#3fb950] leading-relaxed overflow-x-auto max-h-80 whitespace-pre">
                {responseBody || (loading ? 'Awaiting response...' : '// Response payload will appear here')}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
