import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useStore from '../../store';
import { apiIdentifyPhoto, apiIdentifyText, apiGetSpecies } from '../../api';

const KINGDOMS = ['All', 'Plantae', 'Fungi', 'Animalia'];

function ConfidenceBar({ value }) {
  const pct = Math.round((value ?? 0) * 100);
  const color = pct > 70 ? '#4ade80' : pct > 40 ? '#fbbf24' : '#f87171';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 99 }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 99, transition: 'width 0.6s ease' }} />
      </div>
      <span style={{ fontSize: 12, color, fontWeight: 700, minWidth: 34 }}>{pct}%</span>
    </div>
  );
}

function SafetyBadge({ label, color, bg }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 10px', borderRadius: 99, fontSize: 10, fontWeight: 700,
      letterSpacing: '0.06em', textTransform: 'uppercase',
      color, background: bg, border: `1px solid ${color}44`,
    }}>
      {label}
    </span>
  );
}

function ResultCard({ item, rank, onViewSpecies }) {
  const sp = item.species_data ? { ...item.species_data, confidence: item.confidence, score: item.similarity } : item;
  const danger = sp.danger_level?.toLowerCase() ?? 'none';

  const dangerColors = {
    none: '#4ade80', low: '#a3e635', moderate: '#fbbf24', high: '#f97316', extreme: '#ef4444',
  };
  const col = dangerColors[danger] ?? dangerColors.none;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: rank * 0.08 }}
      onClick={() => onViewSpecies(sp.scientific_name)}
      style={{
        background: 'rgba(14, 26, 14, 0.9)',
        border: '1px solid rgba(134, 193, 100, 0.15)',
        borderRadius: 14,
        padding: '14px 16px',
        cursor: 'pointer',
        backdropFilter: 'blur(12px)',
        transition: 'border-color 0.2s',
      }}
      whileHover={{ borderColor: 'rgba(134, 193, 100, 0.4)', y: -2 }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <span style={{
          width: 24, height: 24, borderRadius: 7,
          background: 'rgba(134, 193, 100, 0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 800, color: '#86c164',
        }}>#{rank}</span>
        <div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontStyle: 'italic', fontSize: 14, color: '#e8f0e0' }}>
            {sp.scientific_name}
          </div>
          {sp.common_names?.length > 0 && (
            <div style={{ fontSize: 11, color: '#5a7854', marginTop: 1 }}>
              {(Array.isArray(sp.common_names) ? sp.common_names : [sp.common_names]).slice(0, 2).join(' · ')}
            </div>
          )}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 5 }}>
          {sp.edible && <SafetyBadge label="Edible" color="#4ade80" bg="rgba(74,222,128,0.1)" />}
          {sp.toxic && <SafetyBadge label="Toxic" color={col} bg={`${col}1a`} />}
        </div>
      </div>
      <ConfidenceBar value={sp.confidence ?? sp.score} />
    </motion.div>
  );
}

export default function IdentifyModal() {
  const identifyOpen = useStore(s => s.identifyOpen);
  const closeIdentify = useStore(s => s.closeIdentify);
  const openSpecies = useStore(s => s.openSpecies);

  const [mode, setMode] = useState('photo');
  const [text, setText] = useState('');
  const [kingdom, setKingdom] = useState('All');
  const [location, setLocation] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);
  const fileRef = useRef();

  const handleFile = useCallback((f) => {
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }, []);

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      const k = kingdom === 'All' ? null : kingdom;
      let res;
      if (mode === 'photo') {
        if (!file) { setError('Please upload a photo.'); setLoading(false); return; }
        res = await apiIdentifyPhoto(file, k);
      } else {
        if (!text.trim()) { setError('Please enter a description.'); setLoading(false); return; }
        res = await apiIdentifyText(text.trim(), k);
      }
      const list = Array.isArray(res) ? res : (res?.predictions ?? res?.results ?? res?.matches ?? []);
      setResults(list);
    } catch (e) {
      setError(e.message || 'Identification failed. Is the API running?');
    } finally {
      setLoading(false);
    }
  };

  const handleViewSpecies = (name) => {
    closeIdentify();
    openSpecies(name);
  };

  const inputStyle = {
    width: '100%',
    background: 'rgba(20, 36, 20, 0.8)',
    border: '1px solid rgba(134, 193, 100, 0.2)',
    borderRadius: 12,
    padding: '10px 14px',
    color: '#c8d8c0',
    fontSize: 13,
    outline: 'none',
    boxSizing: 'border-box',
  };

  return (
    <AnimatePresence>
      {identifyOpen && (
        <motion.div
          className="modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closeIdentify}
        >
          <motion.div
            onClick={e => e.stopPropagation()}
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="glass-strong modal-content"
            style={{
              width: '95vw',
              maxWidth: 560,
              maxHeight: '90vh',
              borderRadius: 20,
              overflow: 'auto',
              padding: '24px 20px',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <h2 style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: 22,
                  color: '#e8f0e0',
                  margin: 0,
                }}>
                  🔍 Identify
                </h2>
                <p style={{ fontSize: 12, color: '#5a7854', margin: '4px 0 0' }}>
                  Upload a photo or describe what you see
                </p>
              </div>
              <button onClick={closeIdentify} style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#86c164', fontSize: 18, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>✕</button>
            </div>

            {/* Mode Toggle */}
            <div style={{
              display: 'flex', background: 'rgba(255,255,255,0.04)', borderRadius: 10,
              padding: 3, marginBottom: 16, border: '1px solid rgba(255,255,255,0.06)',
            }}>
              {['photo', 'text'].map(m => (
                <button key={m} onClick={() => { setMode(m); setResults(null); }} style={{
                  flex: 1, padding: '9px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
                  fontWeight: 700, fontSize: 12, letterSpacing: '0.05em', textTransform: 'uppercase',
                  background: mode === m ? 'rgba(134, 193, 100, 0.18)' : 'transparent',
                  color: mode === m ? '#86c164' : '#5a7854',
                  transition: 'all 0.2s',
                }}>
                  {m === 'photo' ? '📷 Photo' : '✍️ Describe'}
                </button>
              ))}
            </div>

            {/* Input Area */}
            {!results && (
              <>
                {mode === 'photo' ? (
                  <div
                    onClick={() => fileRef.current?.click()}
                    onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
                    onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    style={{
                      border: `2px dashed ${dragOver ? '#86c164' : 'rgba(134, 193, 100, 0.25)'}`,
                      borderRadius: 14, background: dragOver ? 'rgba(134, 193, 100, 0.06)' : 'rgba(20, 36, 20, 0.5)',
                      minHeight: preview ? 'auto' : 140, cursor: 'pointer', transition: 'all 0.2s',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      overflow: 'hidden', position: 'relative',
                    }}
                  >
                    <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
                      onChange={e => handleFile(e.target.files[0])} />
                    {preview ? (
                      <>
                        <img src={preview} alt="preview" style={{ width: '100%', maxHeight: 220, objectFit: 'cover' }} />
                        <div style={{
                          position: 'absolute', bottom: 8, right: 8,
                          background: 'rgba(0,0,0,0.6)', borderRadius: 6, padding: '3px 8px',
                          fontSize: 10, color: '#86c164', fontWeight: 700,
                        }}>Tap to change</div>
                      </>
                    ) : (
                      <div style={{ textAlign: 'center', padding: 24 }}>
                        <div style={{ fontSize: 32, marginBottom: 8 }}>📸</div>
                        <div style={{ color: '#5a7854', fontSize: 13, fontWeight: 600 }}>Drop a photo or tap to upload</div>
                        <div style={{ color: '#3d5238', fontSize: 11, marginTop: 3 }}>JPG, PNG, WEBP</div>
                      </div>
                    )}
                  </div>
                ) : (
                  <textarea
                    value={text}
                    onChange={e => setText(e.target.value)}
                    placeholder="Describe what you see — leaf shape, color, habitat, smell, size..."
                    style={{
                      ...inputStyle,
                      minHeight: 100,
                      resize: 'vertical',
                      lineHeight: 1.6,
                      fontFamily: 'inherit',
                    }}
                  />
                )}

                {/* Filters */}
                <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 10, color: '#5a7854', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Kingdom</label>
                    <select value={kingdom} onChange={e => setKingdom(e.target.value)} style={{ ...inputStyle, cursor: 'pointer', appearance: 'none' }}>
                      {KINGDOMS.map(k => <option key={k} value={k}>{k}</option>)}
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 10, color: '#5a7854', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Location</label>
                    <input
                      type="text" value={location} onChange={e => setLocation(e.target.value)}
                      placeholder="e.g. Pacific NW"
                      style={{ ...inputStyle, cursor: 'text' }}
                    />
                  </div>
                </div>

                {error && (
                  <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', fontSize: 12 }}>
                    ⚠ {error}
                  </div>
                )}

                <button onClick={handleSubmit} disabled={loading} style={{
                  width: '100%', marginTop: 16, padding: '13px 0', borderRadius: 12,
                  background: 'linear-gradient(135deg, #4a7c35 0%, #2d5220 100%)',
                  border: '1px solid rgba(134, 193, 100, 0.3)', color: '#c8e6b0',
                  fontSize: 14, fontWeight: 800, cursor: loading ? 'wait' : 'pointer',
                  letterSpacing: '0.06em', textTransform: 'uppercase',
                  opacity: loading ? 0.6 : 1, transition: 'opacity 0.15s',
                }}>
                  {loading ? '⏳ Identifying...' : '🔍 Identify'}
                </button>
              </>
            )}

            {/* Results */}
            {results && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, color: '#e8f0e0', margin: 0 }}>
                    {results.length} Match{results.length !== 1 ? 'es' : ''}
                  </h3>
                  <button onClick={() => setResults(null)} style={{
                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 8, padding: '6px 12px', color: '#86c164', cursor: 'pointer', fontSize: 12,
                  }}>
                    ← New Search
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {results.map((item, i) => (
                    <ResultCard key={i} item={item} rank={i + 1} onViewSpecies={handleViewSpecies} />
                  ))}
                  {results.length === 0 && (
                    <div style={{ textAlign: 'center', padding: 40, color: '#5a7854' }}>
                      <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
                      <div style={{ fontSize: 13 }}>No matches found. Try a different photo or description.</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
