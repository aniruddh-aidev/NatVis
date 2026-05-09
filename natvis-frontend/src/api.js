const API = "http://localhost:8000";

export async function apiIdentifyPhoto(file, kingdom = null) {
  const form = new FormData();
  form.append("file", file);
  if (kingdom) form.append("kingdom", kingdom);
  const r = await fetch(`${API}/identify/photo`, { method: "POST", body: form });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function apiIdentifyText(query, kingdom = null) {
  const body = { description: query };
  if (kingdom) body.kingdom = kingdom;
  const r = await fetch(`${API}/identify/text`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function apiGetSpecies(scientific_name) {
  const r = await fetch(`${API}/species/${encodeURIComponent(scientific_name)}`);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function apiChat(message, session_id, scientific_name = null) {
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

export async function apiListSpecies(kingdom = "Plantae", limit = 30) {
  const params = new URLSearchParams();
  if (kingdom) params.set("kingdom", kingdom);
  params.set("limit", String(limit));
  const r = await fetch(`${API}/species/?${params}`);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export function genSessionId() {
  return "nv-" + Math.random().toString(36).slice(2, 10);
}
