import React, { useState, useEffect, useRef } from 'react';
import './App.css';

const API_BASE = 'http://localhost:8000';

function App() {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Dashboard & Metrics State
  const [metrics, setMetrics] = useState({
    prefix: '',
    cacheStatus: 'idle', // idle, hit, miss
    node: '',
    latency: null,
  });

  // System status (from /status)
  const [systemStatus, setSystemStatus] = useState({
    current_k: 1.0,
    buffer_count: 0
  });
  
  // Batch Flush State
  const [flushing, setFlushing] = useState(false);
  const [flushResult, setFlushResult] = useState(null);
  
  // Search Submission Status
  const [searchStatus, setSearchStatus] = useState('');
  
  // Console logs
  const [logs, setLogs] = useState([
    { time: new Date().toLocaleTimeString(), type: 'info', text: 'System design dashboard initialized.' },
    { time: new Date().toLocaleTimeString(), type: 'info', text: 'Ready to connect to FastAPI backend at ' + API_BASE }
  ]);

  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  // Append a message to the live logger
  const addLog = (text, type = 'info') => {
    setLogs(prev => [
      { time: new Date().toLocaleTimeString(), type, text },
      ...prev.slice(0, 49) // Keep last 50 logs
    ]);
  };

  // Fetch Trending Queries
  const fetchTrending = async () => {
    try {
      const response = await fetch(`${API_BASE}/trending`);
      const data = await response.json();
      if (data && data.queries) {
        setTrending(data.queries);
        addLog(`Successfully loaded ${data.queries.length} trending queries from DB`, 'success');
      }
    } catch (err) {
      console.error('Error fetching trending:', err);
      addLog('Failed to fetch trending queries. Is backend running?', 'error');
    }
  };

  // Fetch general system status (k and Redis buffer count)
  const fetchSystemStatus = async () => {
    try {
      const response = await fetch(`${API_BASE}/status`);
      const data = await response.json();
      if (data && !data.error) {
        setSystemStatus({
          current_k: data.current_k,
          buffer_count: data.buffer_count
        });
      }
    } catch (err) {
      console.error('Error fetching system status:', err);
    }
  };

  // Fetch initial trending and status on mount
  useEffect(() => {
    fetchTrending();
    fetchSystemStatus();
    
    // Poll system status every 2 seconds
    const interval = setInterval(fetchSystemStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  // Debounced search suggest
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 3) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      const startTime = performance.now();
      try {
        const response = await fetch(`${API_BASE}/suggest?q=${encodeURIComponent(trimmed)}`);
        const data = await response.json();
        const endTime = performance.now();
        const latency = Math.round(endTime - startTime);

        if (data) {
          setSuggestions(data.suggestions || []);
          setShowDropdown(true);
          setActiveIndex(-1);
          
          const newMetrics = {
            prefix: data.prefix || trimmed,
            cacheStatus: data.cache || 'miss',
            node: data.node || 'N/A',
            latency
          };
          setMetrics(newMetrics);
          
          addLog(
            `Prefix "${trimmed}" -> suggest key routed to ${newMetrics.node} | Cache: ${newMetrics.cacheStatus.toUpperCase()} (${latency}ms)`,
            newMetrics.cacheStatus === 'hit' ? 'success' : 'warning'
          );
        }
      } catch (err) {
        console.error('Error fetching suggestions:', err);
        addLog(`Failed to fetch suggestions for "${trimmed}"`, 'error');
      } finally {
        setLoading(false);
      }
    }, 250); // 250ms debounce

    return () => clearTimeout(timer);
  }, [query]);

  // Click outside listener to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Submit Search
  const submitSearch = async (searchTerm) => {
    const trimmed = searchTerm.trim();
    if (!trimmed) return;
    
    addLog(`Submitting search query: "${trimmed}"...`);
    try {
      const response = await fetch(`${API_BASE}/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query: trimmed })
      });
      const data = await response.json();
      
      if (data && data.status === 'success') {
        addLog(`Recorded "${trimmed}" in Redis search_count counter.`, 'success');
        setSearchStatus(`Recorded search: "${trimmed}"!`);
        setTimeout(() => setSearchStatus(''), 3000);
        setQuery('');
        setShowDropdown(false);
        fetchSystemStatus(); // update buffer size immediately
      } else {
        addLog(`Failed to record search: ${data.message || 'unknown error'}`, 'error');
      }
    } catch (err) {
      console.error('Error submitting search:', err);
      addLog(`Failed to submit search: is backend running?`, 'error');
    }
  };

  // Keyboard navigation inside dropdown
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (showDropdown && activeIndex >= 0 && activeIndex < suggestions.length) {
        submitSearch(suggestions[activeIndex]);
      } else {
        submitSearch(query);
      }
      return;
    }

    if (!showDropdown || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  // Trigger Redis Batch Flush to Postgres
  const handleFlush = async () => {
    setFlushing(true);
    addLog('Executing batch flush. Transferring Redis counters to DB...', 'info');
    try {
      const response = await fetch(`${API_BASE}/flush`, {
        method: 'POST'
      });
      const data = await response.json();
      
      if (data && data.status === 'success') {
        setFlushResult(data);
        addLog(`Flush complete. Synced ${data.flushed_count} search counters. k value updated from ${data.old_k.toFixed(6)} to ${data.new_k.toFixed(6)}`, 'success');
        if (data.flushed_queries && data.flushed_queries.length > 0) {
          data.flushed_queries.forEach(q => {
            addLog(`Merged: "${q.query}" | Added count: +${q.count} | Score inc: +${q.score.toFixed(2)}`, 'info');
          });
        }
        // Invalidation log
        addLog('All logical node suggest caches invalidated (*:suggest:* keys deleted)', 'warning');
        
        // Refresh trending lists and k value
        fetchTrending();
        fetchSystemStatus();
      } else {
        addLog(`Flush failed: ${data.message || 'unknown error'}`, 'error');
      }
    } catch (err) {
      console.error('Error flushing counters:', err);
      addLog('Failed to trigger database batch flush.', 'error');
    } finally {
      setFlushing(false);
    }
  };

  // Helper to render suggestion matches with highlights
  const renderHighlightedText = (text, prefix) => {
    if (!prefix) return <span>{text}</span>;
    const cleanPrefix = prefix.toLowerCase();
    const cleanText = text.toLowerCase();
    
    if (cleanText.startsWith(cleanPrefix)) {
      const matchLength = cleanPrefix.length;
      return (
        <span>
          <span className="suggestion-highlight">{text.substring(0, matchLength)}</span>
          {text.substring(matchLength)}
        </span>
      );
    }
    return <span>{text}</span>;
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header animate-fade">
        <div className="badge-viva">HLD Assignment Demo</div>
        <h1 className="app-title">Distributed Search Typeahead</h1>
        <p className="app-subtitle">
          Consistent Hashing Cache Nodes • Redis Write Buffering • Recency-Aware Trending Rank (Elastic k value)
        </p>
      </header>

      {/* Main Layout Grid */}
      <div className="dashboard-grid">
        
        {/* Left Column - Search Engine Simulator */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          
          {/* Search Box Card */}
          <div className="card card-purple-glow animate-fade">
            <div className="card-title">
              <span className="card-title-icon">🔍</span> Search Simulator Client
            </div>
            
            <div className="search-wrapper" ref={dropdownRef}>
              <div className="search-input-container">
                <span className="search-icon">🔍</span>
                <input
                  ref={inputRef}
                  type="text"
                  className="search-input"
                  placeholder="Type search term (e.g. iphone, java, weather)..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
                {loading && <div className="spinner" style={{ marginRight: '12px' }}></div>}
                <button 
                  className="btn-search" 
                  onClick={() => submitSearch(query)}
                  disabled={!query.trim()}
                >
                  Search
                </button>
              </div>
              
              {/* suggestions dropdown */}
              {showDropdown && suggestions.length > 0 && (
                <div className="suggestions-dropdown">
                  <div className="suggestions-header">Typeahead Suggestions</div>
                  {suggestions.map((suggestion, idx) => (
                    <div
                      key={idx}
                      className={`suggestion-item ${idx === activeIndex ? 'active' : ''}`}
                      onClick={() => submitSearch(suggestion)}
                      onMouseEnter={() => setActiveIndex(idx)}
                    >
                      <div className="suggestion-text">
                        {renderHighlightedText(suggestion, query)}
                      </div>
                      <span className="suggestion-meta">Select</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
              ℹ️ suggestions are triggered when you type 3 or more characters. Selected queries are queued in the Redis buffer, not updated in Postgres immediately.
            </p>
          </div>

          {/* Admin System Event Console */}
          <div className="card animate-fade">
            <div className="card-title">
              <span className="card-title-icon">📺</span> Live System Logs Console
            </div>
            <div className="console-logs">
              <div className="console-header">
                <span>STDOUT Stream</span>
                <span>Uptime: Active</span>
              </div>
              <div className="log-list">
                {logs.map((log, idx) => (
                  <div key={idx} className="log-item">
                    <span className="log-time">[{log.time}]</span>
                    <span className={`log-type-${log.type}`}>{log.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
        </div>

        {/* Right Column - HLD Architecture Monitoring */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          
          {/* Live Metrics Dashboard */}
          <div className="card card-cyan-glow animate-fade">
            <div className="card-title">
              <span className="card-title-icon">📊</span> HLD Cache Node & Latency Metrics
            </div>
            
            <div className="metrics-row">
              <div className="metric-card">
                <div className="metric-label">Cache Status</div>
                <div className="metric-value">
                  <span className={`status-badge ${metrics.cacheStatus}`}>
                    {metrics.cacheStatus}
                  </span>
                </div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Target Cache Node</div>
                <div className="metric-value mono" style={{ color: metrics.node ? 'var(--accent-cyan)' : 'var(--text-muted)' }}>
                  {metrics.node || 'N/A'}
                </div>
              </div>
              <div className="metric-card">
                <div className="metric-label">API Latency</div>
                <div className="metric-value" style={{ color: metrics.latency ? 'var(--accent-purple)' : 'var(--text-muted)' }}>
                  {metrics.latency !== null ? `${metrics.latency} ms` : 'N/A'}
                </div>
              </div>
            </div>
            
            {/* Cache Node Inspector */}
            <div className="cache-inspector">
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: '500' }}>
                Cache Ring Nodes (Consistent Hashing distribution mapping):
              </div>
              <div className="nodes-grid">
                <div className={`node-item ${metrics.node === 'nodeA' ? 'active' : ''}`}>
                  <div className="node-icon">📦</div>
                  <div className="node-name">nodeA</div>
                  <div className="node-tag">VN: 20</div>
                </div>
                <div className={`node-item ${metrics.node === 'nodeB' ? 'active cyan' : ''}`}>
                  <div className="node-icon">📦</div>
                  <div className="node-name">nodeB</div>
                  <div className="node-tag">VN: 20</div>
                </div>
                <div className={`node-item ${metrics.node === 'nodeC' ? 'active' : ''}`}>
                  <div className="node-icon">📦</div>
                  <div className="node-name">nodeC</div>
                  <div className="node-tag">VN: 20</div>
                </div>
              </div>
            </div>
            
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
              ℹ️ Consistent Hashing routes search prefixes using MD5 hash and bisect search on a 60 virtual nodes ring (20 per server node). Cache keys are formatted as <code>{`{node}:suggest:{prefix}`}</code>.
            </p>
          </div>

          {/* Redis Buffer & Batch Writing Flush Panel */}
          <div className="card animate-fade">
            <div className="card-title">
              <span className="card-title-icon">⚙️</span> Redis Buffer & Batch Writing
            </div>
            
            <div className="buffer-panel">
              <div className="k-indicator">
                <span className="k-label">Redis Write Buffer (Keys matching <code>search_count:*</code>)</span>
                <span className="k-value" style={{ color: systemStatus.buffer_count > 0 ? 'var(--color-miss)' : 'var(--text-muted)' }}>
                  {systemStatus.buffer_count} pending
                </span>
              </div>
              
              <div className="k-indicator">
                <span className="k-label">Current Decay Constant (k factor)</span>
                <span className="k-value">{systemStatus.current_k.toFixed(6)}</span>
              </div>
              
              <button 
                className="btn-flush" 
                onClick={handleFlush}
                disabled={flushing || systemStatus.buffer_count === 0}
              >
                {flushing ? (
                  <>
                    <div className="spinner"></div>
                    <span>Flushing Counters...</span>
                  </>
                ) : (
                  <>
                    <span>🔄 Trigger Batch DB Flush</span>
                  </>
                )}
              </button>

              {flushResult && (
                <div style={{ marginTop: '10px', padding: '12px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', fontSize: '0.85rem' }}>
                  <div style={{ fontWeight: '600', color: 'var(--color-success)', marginBottom: '4px' }}>
                    Last Flush Result:
                  </div>
                  <div>Synced queries: {flushResult.flushed_count}</div>
                  <div>Decay rate (k factor) increased: {flushResult.old_k.toFixed(4)} ➔ {flushResult.new_k.toFixed(4)} (+1.0%)</div>
                </div>
              )}
            </div>
            
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.4', marginTop: '10px' }}>
              ℹ️ To decrease db write pressure, search counts are stored in Redis buffers. Trigerring a flush flushes all counters to PostgreSQL, updates queries counts, decays old ranking weight by updating the system constant <code>k = k * 1.01</code>, and flushes suggestion cache keys to invalidate state.
            </p>
          </div>

          {/* Top Trending Queries Panel */}
          <div className="card animate-fade">
            <div className="trending-header">
              <div className="card-title" style={{ borderBottom: 'none', paddingBottom: 0, margin: 0 }}>
                <span className="card-title-icon">📈</span> Top Trending Queries
              </div>
              <button className="btn-refresh" onClick={fetchTrending} title="Refresh Trending">
                🔄
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {trending.length > 0 ? (
                trending.slice(0, 10).map((t, idx) => (
                  <div 
                    key={idx} 
                    className="trending-item animate-fade"
                    onClick={() => {
                      setQuery(t.query);
                      inputRef.current?.focus();
                      addLog(`Selected trending query: "${t.query}"`, 'info');
                    }}
                  >
                    <span className="trending-rank">#{idx + 1}</span>
                    <span className="trending-text">{t.query}</span>
                    <span className="trending-score">Score: {t.score.toFixed(2)}</span>
                  </div>
                ))
              ) : (
                <div className="trending-empty">
                  No trending queries found in DB. Submit searches and execute a Batch Flush to generate.
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* Overlay Status Toast */}
      {searchStatus && (
        <div className="status-toast">
          {searchStatus}
        </div>
      )}
    </div>
  );
}

export default App;
