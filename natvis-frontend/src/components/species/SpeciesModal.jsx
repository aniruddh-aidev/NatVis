import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useStore from '../../store';
import { apiGetSpecies } from '../../api';

const DANGER_COLOR = {
  none: '#4ade80', low: '#a3e635', moderate: '#fbbf24', high: '#f97316', extreme: '#ef4444',
};

function SafetyBadge({ label, color }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 10px', borderRadius: 99, fontSize: 10, fontWeight: 700,
      letterSpacing: '0.06em', textTransform: 'uppercase',
      color, background: `${color}1a`, border: `1px solid ${color}44`,
    }}>
      {label}
    </span>
  );
}

function InfoRow({ label, value }) {
  if (!value && value !== false) return null;
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
      padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.04)',
    }}>
      <span style={{ fontSize: 11, color: '#5a7854', fontWeight: 600, flexShrink: 0, marginRight: 14 }}>{label}</span>
      <span style={{ fontSize: 12, color: '#c0d0b8', textAlign: 'right' }}>
        {Array.isArray(value) ? value.join(', ') : String(value)}
      </span>
    </div>
  );
}

function Section({ title, icon, children }) {
  if (!children || (Array.isArray(children) && children.every(c => !c))) return null;
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
        {icon && <span style={{ fontSize: 14 }}>{icon}</span>}
        <h3 style={{ margin: 0, fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#4a7c35' }}>
          {title}
        </h3>
        <div style={{ flex: 1, height: 1, background: 'rgba(134, 193, 100, 0.12)', marginLeft: 6 }} />
      </div>
      {children}
    </div>
  );
}

export default function SpeciesModal() {
  const speciesName = useStore(s => s.speciesModalName);
  const closeSpecies = useStore(s => s.closeSpecies);
  const openChat = useStore(s => s.openChat);

  const [species, setSpecies] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!speciesName) { setSpecies(null); return; }
    setLoading(true);
    setError(null);
    apiGetSpecies(speciesName)
      .then(setSpecies)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [speciesName]);

  const danger = species?.danger_level?.toLowerCase() ?? 'none';
  const col = DANGER_COLOR[danger] ?? DANGER_COLOR.none;

  return (
    <AnimatePresence>
      {speciesName && (
        <motion.div
          className="modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closeSpecies}
          style={{ alignItems: 'flex-start', paddingTop: '4vh' }}
        >
          <motion.div
            onClick={e => e.stopPropagation()}
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="glass-strong modal-content"
            style={{
              width: '95vw',
              maxWidth: 620,
              maxHeight: '90vh',
              borderRadius: 20,
              overflow: 'auto',
              padding: '24px 20px 28px',
            }}
          >
            {/* Close button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
              <button onClick={closeSpecies} style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#86c164', fontSize: 18, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>✕</button>
            </div>

            {loading && (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
                <div style={{
                  width: 36, height: 36, border: '3px solid rgba(134,193,100,0.2)',
                  borderTop: '3px solid #86c164', borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                }} />
              </div>
            )}

            {error && (
              <div style={{ textAlign: 'center', padding: 40, color: '#f87171' }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>⚠️</div>
                <div style={{ fontSize: 14 }}>{error}</div>
                <button onClick={closeSpecies} style={{
                  marginTop: 16, padding: '8px 20px', borderRadius: 10,
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                  color: '#86c164', cursor: 'pointer', fontSize: 13,
                }}>Close</button>
              </div>
            )}

            {species && (
              <>
                {/* Header */}
                <h1 style={{
                  fontFamily: "'Playfair Display', serif", fontStyle: 'italic',
                  fontSize: 'clamp(20px, 5vw, 28px)', color: '#e8f0e0',
                  margin: '0 0 4px', lineHeight: 1.2,
                }}>
                  {species.scientific_name}
                </h1>
                {species.common_names && (
                  <p style={{ fontSize: 13, color: '#6a8862', margin: '0 0 12px' }}>
                    {(Array.isArray(species.common_names) ? species.common_names : 
                      typeof species.common_names === 'string' ? JSON.parse(species.common_names) : [species.common_names]
                    ).join(' · ')}
                  </p>
                )}

                {/* Badges */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                  {species.edible && <SafetyBadge label="Edible" color="#4ade80" />}
                  {species.toxic && <SafetyBadge label="Toxic" color={col} />}
                  {species.danger_level && <SafetyBadge label={`Danger: ${species.danger_level}`} color={col} />}
                  {species.family && (
                    <span style={{
                      display: 'inline-block', padding: '2px 10px', borderRadius: 99,
                      background: 'rgba(255,255,255,0.06)', color: '#a8b8a0',
                      fontSize: 10, fontWeight: 600, border: '1px solid rgba(255,255,255,0.08)',
                    }}>{species.family}</span>
                  )}
                  {species.kingdom && (
                    <span style={{
                      display: 'inline-block', padding: '2px 10px', borderRadius: 99,
                      background: 'rgba(255,255,255,0.06)', color: '#a8b8a0',
                      fontSize: 10, fontWeight: 600, border: '1px solid rgba(255,255,255,0.08)',
                    }}>{species.kingdom}</span>
                  )}
                </div>

                {species.description && (
                  <p style={{ fontSize: 13, color: '#8aaa80', lineHeight: 1.7, margin: '0 0 20px' }}>{species.description}</p>
                )}

                {/* Safety Warning */}
                {species.toxic && (
                  <div style={{
                    background: `${col}0d`, border: `1px solid ${col}33`,
                    borderRadius: 14, padding: '14px 16px', marginBottom: 22,
                    borderLeft: `4px solid ${col}`,
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: col, marginBottom: 8 }}>
                      ⚠ Safety Warning
                    </div>
                    {species.toxicity_level && <InfoRow label="Toxicity Level" value={species.toxicity_level} />}
                    {species.toxic_to && <InfoRow label="Toxic To" value={species.toxic_to} />}
                    {species.symptoms && <InfoRow label="Symptoms" value={species.symptoms} />}
                    {species.immediate_action && (
                      <div style={{ marginTop: 10, padding: '10px 12px', background: 'rgba(0,0,0,0.2)', borderRadius: 8 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: col, marginBottom: 3, letterSpacing: '0.06em' }}>IMMEDIATE ACTION</div>
                        <div style={{ fontSize: 12, color: '#e0d0d0', lineHeight: 1.6 }}>{species.immediate_action}</div>
                      </div>
                    )}
                  </div>
                )}

                {/* Appearance & Habitat */}
                <Section title="Appearance & Habitat" icon="🔍">
                  {species.appearance && <p style={{ fontSize: 13, color: '#8aaa80', lineHeight: 1.7, margin: '0 0 10px' }}>{species.appearance}</p>}
                  {species.habitat && <InfoRow label="Habitat" value={species.habitat} />}
                  {species.found_in && <InfoRow label="Found In" value={species.found_in} />}
                </Section>

                {/* Edibility & Uses */}
                <Section title="Edibility & Culinary Uses" icon="🍽">
                  <InfoRow label="Edible" value={species.edible ? 'Yes' : species.edible === false ? 'No' : 'Unknown'} />
                  {species.safe_usage && <InfoRow label="Safe Usage" value={species.safe_usage} />}
                  {species.culinary_uses && <p style={{ fontSize: 13, color: '#8aaa80', lineHeight: 1.7, margin: '8px 0 0' }}>{species.culinary_uses}</p>}
                </Section>

                {/* Medicinal */}
                <Section title="Medicinal & Remedies" icon="🌱">
                  {species.medicinal_uses && <p style={{ fontSize: 13, color: '#8aaa80', lineHeight: 1.7, margin: '0 0 8px' }}>{species.medicinal_uses}</p>}
                  {species.remedies && <p style={{ fontSize: 13, color: '#8aaa80', lineHeight: 1.7, margin: 0 }}>{species.remedies}</p>}
                </Section>

                {/* Ecology */}
                <Section title="Ecological Role" icon="🌍">
                  {species.ecological_role && <p style={{ fontSize: 13, color: '#8aaa80', lineHeight: 1.7, margin: 0 }}>{species.ecological_role}</p>}
                </Section>

                {/* Chat button */}
                <button
                  onClick={() => { closeSpecies(); openChat(species.scientific_name); }}
                  style={{
                    width: '100%', padding: '13px 0', borderRadius: 12,
                    background: 'rgba(134, 193, 100, 0.1)',
                    border: '1px solid rgba(134, 193, 100, 0.25)',
                    color: '#86c164', fontSize: 14, fontWeight: 700,
                    cursor: 'pointer', letterSpacing: '0.04em',
                    transition: 'all 0.15s',
                  }}
                >
                  💬 Chat about {species.scientific_name}
                </button>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
