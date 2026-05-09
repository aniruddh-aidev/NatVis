import { useState, useRef, useEffect, useCallback } from "react";

// ── API ─────────────────────────────────────────────────────────────────────
const API = "http://localhost:8000";

async function apiIdentifyPhoto(file, kingdom = null) {
  const form = new FormData();
  form.append("file", file);
  if (kingdom) form.append("kingdom", kingdom);
  const r = await fetch(`${API}/identify/photo`, { method: "POST", body: form });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

async function apiIdentifyText(query, kingdom = null) {
  const body = { description: query };;
  if (kingdom) body.kingdom = kingdom;
  const r = await fetch(`${API}/identify/text`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

async function apiGetSpecies(scientific_name) {
  const r = await fetch(`${API}/species/${encodeURIComponent(scientific_name)}`);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

async function apiChat(message, session_id, scientific_name = null) {
  const body = { message, session_id };
  if (scientific_name) body.scientific_name = scientific_name;
  const r = await fetch(`${API}/chat/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

async function apiChatHistory(session_id) {
  const r = await fetch(`${API}/chat/history/${session_id}`);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function genSessionId() {
  return "ws-" + Math.random().toString(36).slice(2, 10);
}

const KINGDOMS = ["All", "Plantae", "Fungi", "Animalia"];

const DANGER_COLOR = {
  none: "#4ade80",
  low: "#a3e635",
  moderate: "#fbbf24",
  high: "#f97316",
  extreme: "#ef4444",
};
const DANGER_BG = {
  none: "rgba(74,222,128,0.12)",
  low: "rgba(163,230,53,0.12)",
  moderate: "rgba(251,191,36,0.12)",
  high: "rgba(249,115,22,0.12)",
  extreme: "rgba(239,68,68,0.12)",
};

function safetyColor(level) {
  return DANGER_COLOR[level?.toLowerCase()] ?? DANGER_COLOR.none;
}
function safetyBg(level) {
  return DANGER_BG[level?.toLowerCase()] ?? DANGER_BG.none;
}

function ConfidenceBar({ value }) {
  const pct = Math.round((value ?? 0) * 100);
  const color = pct > 70 ? "#4ade80" : pct > 40 ? "#fbbf24" : "#f87171";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 99 }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 99, transition: "width 0.6s ease" }} />
      </div>
      <span style={{ fontSize: 12, color, fontWeight: 700, minWidth: 34 }}>{pct}%</span>
    </div>
  );
}

function SafetyBadge({ label, color, bg }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700,
      letterSpacing: "0.06em", textTransform: "uppercase",
      color, background: bg, border: `1px solid ${color}44`
    }}>
      {label}
    </span>
  );
}

function Tag({ children }) {
  return (
    <span style={{
      display: "inline-block", padding: "2px 10px", borderRadius: 99,
      background: "rgba(255,255,255,0.06)", color: "#a8b8a0",
      fontSize: 11, fontWeight: 600, letterSpacing: "0.04em", border: "1px solid rgba(255,255,255,0.08)"
    }}>
      {children}
    </span>
  );
}

function Spinner() {
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
      <div style={{
        width: 36, height: 36, border: "3px solid rgba(134,193,100,0.2)",
        borderTop: "3px solid #86c164", borderRadius: "50%",
        animation: "spin 0.8s linear infinite"
      }} />
    </div>
  );
}

// ── Species Result Card (compact, for Results page) ───────────────────────
function SpeciesCard({ species, rank, onSelect, onChat }) {
  const danger = species.danger_level?.toLowerCase() ?? "none";
  const col = safetyColor(danger);
  const bg = safetyBg(danger);

  return (
    <div style={{
      background: "rgba(20,32,20,0.85)", border: "1px solid rgba(134,193,100,0.15)",
      borderRadius: 16, padding: "18px 20px", position: "relative",
      backdropFilter: "blur(12px)", transition: "transform 0.2s, border-color 0.2s",
      cursor: "pointer",
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.borderColor = "rgba(134,193,100,0.4)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.borderColor = "rgba(134,193,100,0.15)"; }}
      onClick={() => onSelect(species.scientific_name)}
    >
      <div style={{ position: "absolute", top: 16, right: 16, display: "flex", gap: 6 }}>
        {species.edible && <SafetyBadge label="Edible" color="#4ade80" bg="rgba(74,222,128,0.1)" />}
        {species.toxic && <SafetyBadge label="Toxic" color={col} bg={bg} />}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <span style={{
          width: 26, height: 26, borderRadius: 8, background: "rgba(134,193,100,0.12)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 12, fontWeight: 800, color: "#86c164", flexShrink: 0
        }}>#{rank}</span>
        <div>
          <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontStyle: "italic", fontSize: 15, color: "#e8f0e0", lineHeight: 1.2 }}>
            {species.scientific_name}
          </div>
          {species.common_names?.length > 0 && (
            <div style={{ fontSize: 12, color: "#7a9870", marginTop: 2 }}>
              {(Array.isArray(species.common_names) ? species.common_names : [species.common_names]).slice(0, 2).join(" · ")}
            </div>
          )}
        </div>
      </div>

      <div style={{ marginBottom: 10 }}>
        <ConfidenceBar value={species.confidence ?? species.score} />
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
        {species.family && <Tag>{species.family}</Tag>}
        {species.kingdom && <Tag>{species.kingdom}</Tag>}
        {species.danger_level && danger !== "none" && (
          <SafetyBadge label={`⚠ ${species.danger_level}`} color={col} bg={bg} />
        )}
      </div>

      {species.description && (
        <p style={{ fontSize: 13, color: "#7a9870", lineHeight: 1.55, margin: "0 0 14px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {species.description}
        </p>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={e => { e.stopPropagation(); onSelect(species.scientific_name); }} style={btnStyle("#86c164")}>
          View Details
        </button>
        <button onClick={e => { e.stopPropagation(); onChat(species.scientific_name); }} style={btnStyle("transparent", "#86c164")}>
          Chat
        </button>
      </div>
    </div>
  );
}

function btnStyle(bg, border) {
  const isTransparent = bg === "transparent";
  return {
    padding: "7px 16px", borderRadius: 8, border: `1px solid ${border ?? bg}`,
    background: isTransparent ? "transparent" : `${bg}22`,
    color: isTransparent ? border : "#86c164",
    fontSize: 12, fontWeight: 700, cursor: "pointer", letterSpacing: "0.04em",
    transition: "all 0.15s",
  };
}

// ── HOME / SEARCH PAGE ────────────────────────────────────────────────────
function HomePage({ onResults, onLoading }) {
  const [mode, setMode] = useState("photo"); // "photo" | "text"
  const [text, setText] = useState("");
  const [kingdom, setKingdom] = useState("All");
  const [location, setLocation] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState(null);
  const fileRef = useRef();

  function handleFile(f) {
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function handleSubmit() {
    setError(null);
    try {
      onLoading(true);
      const k = kingdom === "All" ? null : kingdom;
      let results;
      if (mode === "photo") {
        if (!file) { setError("Please upload a photo."); onLoading(false); return; }
        results = await apiIdentifyPhoto(file, k);
      } else {
        if (!text.trim()) { setError("Please enter a description."); onLoading(false); return; }
        results = await apiIdentifyText(text.trim(), k);
      }
      onResults(results, { mode, text, file, kingdom, location });
    } catch (e) {
      setError(e.message || "Identification failed. Is the API running?");
    } finally {
      onLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "0 16px 80px" }}>
      {/* Hero */}
      <div style={{ textAlign: "center", padding: "48px 0 36px" }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>🌿</div>
        <h1 style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: "clamp(28px, 7vw, 42px)", fontWeight: 700,
          color: "#e8f0e0", margin: "0 0 10px", lineHeight: 1.15,
          textShadow: "0 2px 20px rgba(134,193,100,0.2)"
        }}>
          NatVis
        </h1>
        <p style={{ fontSize: 15, color: "#6a8862", margin: 0, letterSpacing: "0.04em" }}>
          Identify flora, fauna & fungi — know what's safe
        </p>
      </div>

      {/* Mode Toggle */}
      <div style={{
        display: "flex", background: "rgba(255,255,255,0.04)", borderRadius: 12,
        padding: 4, marginBottom: 20, border: "1px solid rgba(255,255,255,0.07)"
      }}>
        {["photo", "text"].map(m => (
          <button key={m} onClick={() => setMode(m)} style={{
            flex: 1, padding: "10px 0", borderRadius: 9, border: "none", cursor: "pointer",
            fontWeight: 700, fontSize: 13, letterSpacing: "0.05em", textTransform: "uppercase",
            transition: "all 0.2s",
            background: mode === m ? "rgba(134,193,100,0.18)" : "transparent",
            color: mode === m ? "#86c164" : "#5a7854",
          }}>
            {m === "photo" ? "📷 Photo" : "✍️ Describe"}
          </button>
        ))}
      </div>

      {/* Input Area */}
      {mode === "photo" ? (
        <div
          onClick={() => fileRef.current?.click()}
          onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          style={{
            border: `2px dashed ${dragOver ? "#86c164" : "rgba(134,193,100,0.25)"}`,
            borderRadius: 16, background: dragOver ? "rgba(134,193,100,0.06)" : "rgba(20,32,20,0.5)",
            minHeight: preview ? "auto" : 180, cursor: "pointer", transition: "all 0.2s",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            overflow: "hidden", position: "relative",
          }}
        >
          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }}
            onChange={e => handleFile(e.target.files[0])} />
          {preview ? (
            <>
              <img src={preview} alt="preview" style={{ width: "100%", maxHeight: 280, objectFit: "cover" }} />
              <div style={{
                position: "absolute", bottom: 10, right: 10,
                background: "rgba(0,0,0,0.6)", borderRadius: 8, padding: "4px 10px",
                fontSize: 11, color: "#86c164", fontWeight: 700
              }}>
                Tap to change
              </div>
            </>
          ) : (
            <div style={{ textAlign: "center", padding: 32 }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>📸</div>
              <div style={{ color: "#5a7854", fontSize: 14, fontWeight: 600 }}>Drop a photo or tap to upload</div>
              <div style={{ color: "#3d5238", fontSize: 12, marginTop: 4 }}>JPG, PNG, WEBP supported</div>
            </div>
          )}
        </div>
      ) : (
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Describe what you see — leaf shape, color, habitat, smell, size, features..."
          style={{
            width: "100%", minHeight: 140, background: "rgba(20,32,20,0.7)",
            border: "1px solid rgba(134,193,100,0.2)", borderRadius: 16, padding: "16px 18px",
            color: "#c8d8c0", fontSize: 14, lineHeight: 1.6, resize: "vertical",
            outline: "none", fontFamily: "inherit", boxSizing: "border-box",
          }}
        />
      )}

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 11, color: "#5a7854", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", display: "block", marginBottom: 5 }}>Kingdom</label>
          <select value={kingdom} onChange={e => setKingdom(e.target.value)} style={selectStyle}>
            {KINGDOMS.map(k => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 11, color: "#5a7854", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", display: "block", marginBottom: 5 }}>Location (optional)</label>
          <input
            type="text" value={location} onChange={e => setLocation(e.target.value)}
            placeholder="e.g. Pacific Northwest"
            style={{ ...selectStyle, cursor: "text" }}
          />
        </div>
      </div>

      {error && (
        <div style={{ marginTop: 14, padding: "12px 16px", borderRadius: 10, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171", fontSize: 13 }}>
          ⚠ {error}
        </div>
      )}

      <button onClick={handleSubmit} style={{
        width: "100%", marginTop: 18, padding: "15px 0", borderRadius: 14,
        background: "linear-gradient(135deg, #4a7c35 0%, #2d5220 100%)",
        border: "1px solid rgba(134,193,100,0.3)", color: "#c8e6b0",
        fontSize: 15, fontWeight: 800, cursor: "pointer", letterSpacing: "0.06em",
        textTransform: "uppercase", transition: "opacity 0.15s",
      }}
        onMouseEnter={e => e.currentTarget.style.opacity = 0.85}
        onMouseLeave={e => e.currentTarget.style.opacity = 1}
      >
        Identify
      </button>
    </div>
  );
}

const selectStyle = {
  width: "100%", background: "rgba(20,32,20,0.7)", border: "1px solid rgba(134,193,100,0.2)",
  borderRadius: 10, padding: "9px 12px", color: "#a8b8a0", fontSize: 13,
  outline: "none", appearance: "none", cursor: "pointer", boxSizing: "border-box"
};

// ── RESULTS PAGE ──────────────────────────────────────────────────────────
function ResultsPage({ results, query, onSelectSpecies, onChat, onBack }) {
  const list = Array.isArray(results) ? results : (results?.predictions ?? results?.results ?? results?.matches ?? []);

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: "0 16px 80px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "24px 0 20px" }}>
        <button onClick={onBack} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "8px 14px", color: "#86c164", cursor: "pointer", fontSize: 13 }}>
          ← Back
        </button>
        <div>
          <h2 style={{ margin: 0, fontFamily: "'Playfair Display', serif", fontSize: 20, color: "#e8f0e0" }}>
            {list.length} Match{list.length !== 1 ? "es" : ""}
          </h2>
          {query.text && <div style={{ fontSize: 12, color: "#5a7854", marginTop: 2 }}>"{query.text}"</div>}
        </div>
      </div>

      {list.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, color: "#5a7854" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
          <div style={{ fontSize: 15 }}>No matches found. Try a different photo or description.</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {list.map((item, i) => {
  const sp = item.species_data ? { ...item.species_data, confidence: item.confidence, score: item.similarity } : item;
  return (
    <SpeciesCard key={sp.scientific_name ?? i} species={sp} rank={i + 1}
      onSelect={onSelectSpecies} onChat={onChat} />
  );
})}
        </div>
      )}
    </div>
  );
}

// ── SPECIES DETAIL PAGE ───────────────────────────────────────────────────
function Section({ title, children, icon }) {
  if (!children || (Array.isArray(children) && children.every(c => !c))) return null;
  return (
    <div style={{ marginBottom: 26 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        {icon && <span style={{ fontSize: 16 }}>{icon}</span>}
        <h3 style={{ margin: 0, fontSize: 12, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "#4a7c35" }}>
          {title}
        </h3>
        <div style={{ flex: 1, height: 1, background: "rgba(134,193,100,0.12)", marginLeft: 8 }} />
      </div>
      {children}
    </div>
  );
}

function InfoRow({ label, value }) {
  if (!value && value !== false) return null;
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <span style={{ fontSize: 12, color: "#5a7854", fontWeight: 600, flexShrink: 0, marginRight: 16 }}>{label}</span>
      <span style={{ fontSize: 13, color: "#c0d0b8", textAlign: "right" }}>
        {Array.isArray(value) ? value.join(", ") : String(value)}
      </span>
    </div>
  );
}

function SpeciesDetailPage({ scientific_name, onBack, onChat }) {
  const [species, setSpecies] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    apiGetSpecies(scientific_name)
      .then(setSpecies)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [scientific_name]);

  if (loading) return <Spinner />;
  if (error) return <div style={{ padding: 40, color: "#f87171", textAlign: "center" }}>⚠ {error}</div>;
  if (!species) return null;

  const danger = species.danger_level?.toLowerCase() ?? "none";
  const col = safetyColor(danger);

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: "0 16px 80px" }}>
      {/* Header */}
      <div style={{ padding: "24px 0 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <button onClick={onBack} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "8px 14px", color: "#86c164", cursor: "pointer", fontSize: 13 }}>
            ← Back
          </button>
          <button onClick={() => onChat(scientific_name)} style={{ marginLeft: "auto", background: "rgba(134,193,100,0.1)", border: "1px solid rgba(134,193,100,0.25)", borderRadius: 10, padding: "8px 16px", color: "#86c164", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
            💬 Chat about this
          </button>
        </div>

        <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontStyle: "italic", fontSize: "clamp(22px,6vw,30px)", color: "#e8f0e0", margin: "0 0 6px", lineHeight: 1.2 }}>
          {species.scientific_name}
        </h1>
        {species.common_names?.length > 0 && (
          <p style={{ fontSize: 14, color: "#6a8862", margin: "0 0 14px" }}>
            {(Array.isArray(species.common_names) ? species.common_names : [species.common_names]).join(" · ")}
          </p>
        )}

        {/* Safety Row */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
          {species.edible === "Edible" && <SafetyBadge label="Edible" color="#4ade80" bg="rgba(74,222,128,0.1)" />}
{species.toxic === "Yes" && <SafetyBadge label="Toxic" color={col} bg={bg} />}
          {species.danger_level && <SafetyBadge label={`Danger: ${species.danger_level}`} color={col} bg={safetyBg(danger)} />}
          {species.family && <Tag>{species.family}</Tag>}
          {species.kingdom && <Tag>{species.kingdom}</Tag>}
        </div>

        {species.description && (
          <p style={{ fontSize: 14, color: "#8aaa80", lineHeight: 1.7, margin: 0 }}>{species.description}</p>
        )}
      </div>

      {/* ⚠ Safety Alert */}
      {species.toxic && (
        <div style={{
          background: `${safetyBg(danger)}`, border: `1px solid ${col}33`,
          borderRadius: 14, padding: "16px 18px", marginBottom: 24,
          borderLeft: `4px solid ${col}`
        }}>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: col, marginBottom: 8 }}>
            ⚠ Safety Warning
          </div>
          {species.toxicity_level && <InfoRow label="Toxicity Level" value={species.toxicity_level} />}
          {species.toxic_to && <InfoRow label="Toxic To" value={species.toxic_to} />}
          {species.symptoms && <InfoRow label="Symptoms" value={species.symptoms} />}
          {species.immediate_action && (
            <div style={{ marginTop: 10, padding: "10px 14px", background: "rgba(0,0,0,0.2)", borderRadius: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: col, marginBottom: 4, letterSpacing: "0.06em" }}>IMMEDIATE ACTION</div>
              <div style={{ fontSize: 13, color: "#e0d0d0", lineHeight: 1.6 }}>{species.immediate_action}</div>
            </div>
          )}
        </div>
      )}

      {/* Appearance */}
      <Section title="Appearance & Habitat" icon="🔍">
        {species.appearance && <p style={{ fontSize: 14, color: "#8aaa80", lineHeight: 1.7, margin: "0 0 12px" }}>{species.appearance}</p>}
        {species.habitat && <InfoRow label="Habitat" value={species.habitat} />}
        {species.found_in && <InfoRow label="Found In" value={species.found_in} />}
      </Section>

      {/* Edibility & Uses */}
      <Section title="Edibility & Culinary Uses" icon="🍽">
        <InfoRow label="Edible" value={species.edible ? "Yes" : species.edible === false ? "No" : "Unknown"} />
        {species.safe_usage && <InfoRow label="Safe Usage" value={species.safe_usage} />}
        {species.culinary_uses && <p style={{ fontSize: 14, color: "#8aaa80", lineHeight: 1.7, margin: "8px 0 0" }}>{species.culinary_uses}</p>}
      </Section>

      {/* Medicinal */}
      <Section title="Medicinal & Remedies" icon="🌱">
        {species.medicinal_uses && <p style={{ fontSize: 14, color: "#8aaa80", lineHeight: 1.7, margin: "0 0 10px" }}>{species.medicinal_uses}</p>}
        {species.remedies && <p style={{ fontSize: 14, color: "#8aaa80", lineHeight: 1.7, margin: 0 }}>{species.remedies}</p>}
      </Section>

      {/* Ecology */}
      <Section title="Ecological Role" icon="🌍">
        {species.ecological_role && <p style={{ fontSize: 14, color: "#8aaa80", lineHeight: 1.7, margin: 0 }}>{species.ecological_role}</p>}
      </Section>

      {/* Data quality */}
      <div style={{ padding: "12px 16px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
        <InfoRow label="Data Verified" value={species.data_verified ? "✓ Yes" : "Unverified"} />
        {species.completeness !== undefined && <InfoRow label="Completeness" value={`${Math.round(species.completeness * 100)}%`} />}
        {species.confidence_note && <p style={{ fontSize: 12, color: "#5a7854", margin: "8px 0 0", lineHeight: 1.5 }}>{species.confidence_note}</p>}
      </div>
    </div>
  );
}

// ── CHAT PAGE ─────────────────────────────────────────────────────────────
function ChatPage({ scientific_name, onBack }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(genSessionId);
  const bottomRef = useRef();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (scientific_name) {
      setMessages([{
        role: "assistant",
        content: `I'm ready to answer questions about *${scientific_name}*. Ask me about its safety, edibility, medicinal uses, habitat, or anything else.`
      }]);
    }
  }, [scientific_name]);

  async function sendMessage() {
    const msg = input.trim();
    if (!msg || loading) return;
    setInput("");
    setMessages(m => [...m, { role: "user", content: msg }]);
    setLoading(true);
    try {
      const res = await apiChat(msg, sessionId, scientific_name);
      setMessages(m => [...m, { role: "assistant", content: res.response ?? res.message ?? JSON.stringify(res) }]);
    } catch (e) {
      setMessages(m => [...m, { role: "assistant", content: `⚠ Error: ${e.message}` }]);
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", display: "flex", flexDirection: "column", height: "100dvh" }}>
      {/* Header */}
      <div style={{ padding: "16px 16px 14px", borderBottom: "1px solid rgba(134,193,100,0.1)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={onBack} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "7px 12px", color: "#86c164", cursor: "pointer", fontSize: 13, flexShrink: 0 }}>
            ← Back
          </button>
          <div style={{ overflow: "hidden" }}>
            <div style={{ fontSize: 12, color: "#4a7c35", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              💬 Field Chat
            </div>
            {scientific_name && (
              <div style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic", fontSize: 15, color: "#c8d8c0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {scientific_name}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
            {msg.role === "assistant" && (
              <div style={{ width: 30, height: 30, borderRadius: 10, background: "rgba(134,193,100,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0, marginRight: 10, marginTop: 2 }}>
                🌿
              </div>
            )}
            <div style={{
              maxWidth: "80%", padding: "11px 15px", borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
              background: msg.role === "user" ? "rgba(74,124,53,0.25)" : "rgba(20,32,20,0.9)",
              border: `1px solid ${msg.role === "user" ? "rgba(134,193,100,0.25)" : "rgba(255,255,255,0.07)"}`,
              fontSize: 14, color: "#c8d8c0", lineHeight: 1.65,
              backdropFilter: "blur(8px)"
            }}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: 10, background: "rgba(134,193,100,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🌿</div>
            <div style={{ display: "flex", gap: 5, padding: "12px 16px", background: "rgba(20,32,20,0.9)", borderRadius: "16px 16px 16px 4px", border: "1px solid rgba(255,255,255,0.07)" }}>
              {[0, 1, 2].map(j => (
                <div key={j} style={{ width: 6, height: 6, borderRadius: "50%", background: "#86c164", animation: `pulse 1.2s ${j * 0.2}s ease-in-out infinite` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: "12px 16px 20px", borderTop: "1px solid rgba(134,193,100,0.1)", flexShrink: 0 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder={`Ask about ${scientific_name ?? "this species"}...`}
            rows={1}
            style={{
              flex: 1, background: "rgba(20,32,20,0.8)", border: "1px solid rgba(134,193,100,0.2)",
              borderRadius: 14, padding: "12px 16px", color: "#c8d8c0", fontSize: 14,
              outline: "none", resize: "none", fontFamily: "inherit", lineHeight: 1.5,
              boxSizing: "border-box",
            }}
          />
          <button onClick={sendMessage} disabled={loading || !input.trim()} style={{
            width: 46, height: 46, borderRadius: 14, background: "rgba(74,124,53,0.4)",
            border: "1px solid rgba(134,193,100,0.3)", color: "#86c164", cursor: "pointer",
            fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center",
            opacity: loading || !input.trim() ? 0.4 : 1, transition: "opacity 0.15s", flexShrink: 0
          }}>
            ↑
          </button>
        </div>
        <div style={{ fontSize: 11, color: "#3d5238", textAlign: "center", marginTop: 8 }}>
          Enter to send · Shift+Enter for new line
        </div>
      </div>
    </div>
  );
}

// ── NAV BAR ───────────────────────────────────────────────────────────────
function NavBar({ page, onNav }) {
  const tabs = [
    { id: "home", icon: "🔍", label: "Search" },
    { id: "results", icon: "📋", label: "Results" },
    { id: "detail", icon: "🌿", label: "Species" },
    { id: "chat", icon: "💬", label: "Chat" },
  ];
  return (
    <div style={{
      position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100,
      background: "rgba(10,18,10,0.95)", borderTop: "1px solid rgba(134,193,100,0.1)",
      backdropFilter: "blur(20px)", display: "flex",
      paddingBottom: "env(safe-area-inset-bottom, 0)"
    }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => onNav(t.id)} style={{
          flex: 1, padding: "10px 0 8px", border: "none", background: "transparent",
          cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
          color: page === t.id ? "#86c164" : "#3d5238", transition: "color 0.15s"
        }}>
          <span style={{ fontSize: 18 }}>{t.icon}</span>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>
            {t.label}
          </span>
          {page === t.id && (
            <div style={{ position: "absolute", bottom: "env(safe-area-inset-bottom, 0)", width: 24, height: 2, background: "#86c164", borderRadius: 99 }} />
          )}
        </button>
      ))}
    </div>
  );
}

// ── GLOBAL STYLES ─────────────────────────────────────────────────────────
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400;1,700&family=DM+Sans:wght@400;600;700;800&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #0c1a0c; font-family: 'DM Sans', sans-serif; color: #c8d8c0; }
    ::-webkit-scrollbar { width: 4px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: rgba(134,193,100,0.2); border-radius: 99px; }
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes pulse { 0%,100% { opacity: 0.3; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1); } }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    textarea, select, input { -webkit-appearance: none; }
  `}</style>
);

// ── ROOT APP ──────────────────────────────────────────────────────────────
export default function NatVis() {
  const [page, setPage] = useState("home");
  const [results, setResults] = useState(null);
  const [query, setQuery] = useState({});
  const [selectedSpecies, setSelectedSpecies] = useState(null);
  const [chatSpecies, setChatSpecies] = useState(null);
  const [globalLoading, setGlobalLoading] = useState(false);

  function handleResults(data, q) {
    setResults(data);
    setQuery(q);
    setPage("results");
  }

  function handleSelectSpecies(name) {
    setSelectedSpecies(name);
    setPage("detail");
  }

  function handleChat(name) {
    setChatSpecies(name);
    setPage("chat");
  }

  function navTo(id) {
    if (id === "results" && !results) return;
    if (id === "detail" && !selectedSpecies) return;
    if (id === "chat" && !chatSpecies) return;
    setPage(id);
  }

  const bg = `
    radial-gradient(ellipse at 20% 80%, rgba(40,70,20,0.35) 0%, transparent 60%),
    radial-gradient(ellipse at 80% 20%, rgba(20,50,15,0.25) 0%, transparent 55%),
    #0c1a0c
  `;

  return (
    <>
      <GlobalStyles />
      <div style={{ minHeight: "100dvh", background: bg, position: "relative" }}>
        {/* Subtle grain texture overlay */}
        <div style={{
          position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E")`,
          opacity: 0.5,
        }} />

        {globalLoading && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(12,26,12,0.7)", zIndex: 200, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }}>
            <Spinner />
            <div style={{ marginTop: 16, color: "#6a8862", fontSize: 14, letterSpacing: "0.06em" }}>Identifying…</div>
          </div>
        )}

        <div style={{ position: "relative", zIndex: 1, animation: "fadeIn 0.3s ease" }}>
          {page === "home" && (
            <HomePage onResults={handleResults} onLoading={setGlobalLoading} />
          )}
          {page === "results" && results && (
            <ResultsPage results={results} query={query}
              onSelectSpecies={handleSelectSpecies}
              onChat={handleChat}
              onBack={() => setPage("home")} />
          )}
          {page === "detail" && selectedSpecies && (
            <SpeciesDetailPage scientific_name={selectedSpecies}
              onBack={() => setPage(results ? "results" : "home")}
              onChat={handleChat} />
          )}
          {page === "chat" && (
            <ChatPage scientific_name={chatSpecies}
              onBack={() => setPage(selectedSpecies ? "detail" : results ? "results" : "home")} />
          )}
        </div>

        <NavBar page={page} onNav={navTo} />
      </div>
    </>
  );
}
