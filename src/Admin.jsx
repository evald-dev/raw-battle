import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";
import "./styles.css";
import "./admin.css";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Tabs ──────────────────────────────────────────────────────────────────
const TABS = ["Раунды", "Участники", "Судьи"];

export default function Admin() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("Раунды");

  return (
    <>
      <div className="video-bg" aria-hidden="true">
        <video autoPlay muted playsInline preload="auto" loop>
          <source src="videos/tv-noise.mp4" type="video/mp4" />
        </video>
      </div>

      <div className="top-marquee" aria-hidden="true">
        <div className="top-marquee-track">
          0.49 GERMANY • СЫРОЙ БАТЛ • ADMIN PANEL • 0.49 GERMANY • СЫРОЙ БАТЛ • ADMIN PANEL •
        </div>
      </div>

      <main className="admin-layout">
        <div className="admin-topbar">
          <button className="tabelle-back" onClick={() => window.location.href = "/raw-battle/"}>← zurück</button>
          <div className="admin-title">Admin Panel</div>
        </div>

        <div className="admin-tabs">
          {TABS.map(t => (
            <button
              key={t}
              className={`admin-tab${activeTab === t ? " active" : ""}`}
              onClick={() => setActiveTab(t)}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="admin-content">
          {activeTab === "Раунды"     && <RoundsTab />}
          {activeTab === "Участники"  && <ParticipantsTab />}
          {activeTab === "Судьи"      && <JudgesTab />}
        </div>
      </main>
    </>
  );
}

// ── Rounds Tab ────────────────────────────────────────────────────────────
function RoundsTab() {
  const [rounds,  setRounds]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [form,    setForm]    = useState({ name: "", type: "qualifying", extra_info: "", visual_url: "" });
  const [editing, setEditing] = useState(null);
  const [saving,  setSaving]  = useState(false);

  useEffect(() => { loadRounds(); }, []);

  async function loadRounds() {
    setLoading(true);
    const { data } = await supabase.from("rounds").select("*").order("order_num");
    setRounds(data || []);
    setLoading(false);
  }

  async function save() {
    if (!form.name.trim()) return;
    setSaving(true);
    if (editing) {
      await supabase.from("rounds").update({
        name:       form.name,
        type:       form.type,
        extra_info: form.extra_info,
        visual_url: form.visual_url,
      }).eq("id", editing);
      setEditing(null);
    } else {
      await supabase.from("rounds").insert({
        name:       form.name,
        type:       form.type,
        extra_info: form.extra_info,
        visual_url: form.visual_url,
        order_num:  rounds.length + 1,
      });
    }
    setForm({ name: "", type: "qualifying", extra_info: "", visual_url: "" });
    setSaving(false);
    loadRounds();
  }

  async function deleteRound(id) {
    if (!confirm("Удалить раунд? Все оценки за этот раунд также будут удалены.")) return;
    await supabase.from("scores").delete().eq("round_id", id);
    await supabase.from("participants").delete().eq("round_id", id);
    await supabase.from("rounds").delete().eq("id", id);
    loadRounds();
  }

  function startEdit(r) {
    setEditing(r.id);
    setForm({ name: r.name, type: r.type, extra_info: r.extra_info || "", visual_url: r.visual_url || "" });
  }

  function cancelEdit() {
    setEditing(null);
    setForm({ name: "", type: "qualifying", extra_info: "", visual_url: "" });
  }

  async function moveUp(idx) {
    if (idx === 0) return;
    const a = rounds[idx], b = rounds[idx - 1];
    await supabase.from("rounds").update({ order_num: b.order_num }).eq("id", a.id);
    await supabase.from("rounds").update({ order_num: a.order_num }).eq("id", b.id);
    loadRounds();
  }

  async function moveDown(idx) {
    if (idx === rounds.length - 1) return;
    const a = rounds[idx], b = rounds[idx + 1];
    await supabase.from("rounds").update({ order_num: b.order_num }).eq("id", a.id);
    await supabase.from("rounds").update({ order_num: a.order_num }).eq("id", b.id);
    loadRounds();
  }

  return (
    <div className="admin-section">
      <div className="admin-form">
        <div className="admin-form-title">{editing ? "Редактировать раунд" : "Новый раунд"}</div>

        <div className="admin-form-row">
          <label className="admin-label">Название</label>
          <input
            className="admin-input"
            placeholder="Раунд 1"
            value={form.name}
            onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
          />
        </div>

        <div className="admin-form-row">
          <label className="admin-label">Тип</label>
          <select
            className="admin-input"
            value={form.type}
            onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
          >
            <option value="qualifying">Отборочный (0–10)</option>
            <option value="knockout">Нокаут (победитель/проигравший)</option>
          </select>
        </div>

        <div className="admin-form-row">
          <label className="admin-label">Доп. информация</label>
          <textarea
            className="admin-input admin-textarea"
            placeholder="Тема раунда, правила..."
            value={form.extra_info}
            onChange={e => setForm(p => ({ ...p, extra_info: e.target.value }))}
            rows={3}
          />
        </div>

        <div className="admin-form-row">
          <label className="admin-label">URL визуала</label>
          <input
            className="admin-input"
            placeholder="https://..."
            value={form.visual_url}
            onChange={e => setForm(p => ({ ...p, visual_url: e.target.value }))}
          />
        </div>

        <div className="admin-form-btns">
          {editing && (
            <button className="admin-btn-cancel" onClick={cancelEdit}>Отмена</button>
          )}
          <button className="admin-btn-save" onClick={save} disabled={saving}>
            {saving ? "Сохранение..." : editing ? "Сохранить" : "+ Добавить раунд"}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="admin-empty">Загрузка...</div>
      ) : rounds.length === 0 ? (
        <div className="admin-empty">Раундов пока нет</div>
      ) : (
        <div className="admin-list">
          {rounds.map((r, idx) => (
            <div className="admin-list-item" key={r.id}>
              <div className="admin-list-order">
                <button className="admin-order-btn" onClick={() => moveUp(idx)} disabled={idx === 0}>↑</button>
                <button className="admin-order-btn" onClick={() => moveDown(idx)} disabled={idx === rounds.length - 1}>↓</button>
              </div>
              <div className="admin-list-info">
                <div className="admin-list-name">{r.name}</div>
                <div className="admin-list-meta">
                  {r.type === "knockout" ? "Нокаут" : "Отборочный"}
                  {r.extra_info && ` · ${r.extra_info.slice(0, 40)}...`}
                </div>
              </div>
              <div className="admin-list-actions">
                <button className="admin-action-btn edit" onClick={() => startEdit(r)}>✎</button>
                <button className="admin-action-btn delete" onClick={() => deleteRound(r.id)}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Participants Tab ───────────────────────────────────────────────────────
function ParticipantsTab() {
  const [rounds,       setRounds]       = useState([]);
  const [activeRound,  setActiveRound]  = useState(null);
  const [participants, setParticipants] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [name,         setName]         = useState("");
  const [saving,       setSaving]       = useState(false);
  const [editing,      setEditing]      = useState(null);
  const [editName,     setEditName]     = useState("");

  useEffect(() => { loadRounds(); }, []);
  useEffect(() => { if (activeRound) loadParticipants(activeRound); }, [activeRound]);

  async function loadRounds() {
    const { data } = await supabase.from("rounds").select("*").order("order_num");
    setRounds(data || []);
    if (data?.length) setActiveRound(data[0].id);
    setLoading(false);
  }

  async function loadParticipants(roundId) {
    setLoading(true);
    const { data } = await supabase
      .from("participants")
      .select("*")
      .eq("round_id", roundId)
      .order("order_num");
    setParticipants(data || []);
    setLoading(false);
  }

  async function add() {
    if (!name.trim() || !activeRound) return;
    setSaving(true);
    await supabase.from("participants").insert({
      name:      name.trim(),
      round_id:  activeRound,
      order_num: participants.length + 1,
    });
    setName("");
    setSaving(false);
    loadParticipants(activeRound);
  }

  async function remove(id) {
    if (!confirm("Удалить участника? Все его оценки также будут удалены.")) return;
    await supabase.from("scores").delete().eq("participant_id", id);
    await supabase.from("participants").delete().eq("id", id);
    loadParticipants(activeRound);
  }

  async function saveEdit(id) {
    if (!editName.trim()) return;
    await supabase.from("participants").update({ name: editName.trim() }).eq("id", id);
    setEditing(null);
    loadParticipants(activeRound);
  }

  async function moveUp(idx) {
    if (idx === 0) return;
    const a = participants[idx], b = participants[idx - 1];
    await supabase.from("participants").update({ order_num: b.order_num }).eq("id", a.id);
    await supabase.from("participants").update({ order_num: a.order_num }).eq("id", b.id);
    loadParticipants(activeRound);
  }

  async function moveDown(idx) {
    if (idx === participants.length - 1) return;
    const a = participants[idx], b = participants[idx + 1];
    await supabase.from("participants").update({ order_num: b.order_num }).eq("id", a.id);
    await supabase.from("participants").update({ order_num: a.order_num }).eq("id", b.id);
    loadParticipants(activeRound);
  }

  return (
    <div className="admin-section">
      {/* Runden-Auswahl */}
      <div className="admin-round-select">
        {rounds.map(r => (
          <button
            key={r.id}
            className={`tabelle-round-tab${activeRound === r.id ? " active" : ""}`}
            onClick={() => setActiveRound(r.id)}
          >
            {r.name}
          </button>
        ))}
      </div>

      {/* Formular */}
      <div className="admin-form">
        <div className="admin-form-title">Новый участник</div>
        <div className="admin-form-row admin-form-inline">
          <input
            className="admin-input"
            placeholder="Имя участника"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && add()}
          />
          <button className="admin-btn-save" onClick={add} disabled={saving || !name.trim()}>
            {saving ? "..." : "+ Добавить"}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="admin-empty">Загрузка...</div>
      ) : participants.length === 0 ? (
        <div className="admin-empty">Участников пока нет</div>
      ) : (
        <div className="admin-list">
          {participants.map((p, idx) => (
            <div className="admin-list-item" key={p.id}>
              <div className="admin-list-order">
                <button className="admin-order-btn" onClick={() => moveUp(idx)} disabled={idx === 0}>↑</button>
                <button className="admin-order-btn" onClick={() => moveDown(idx)} disabled={idx === participants.length - 1}>↓</button>
              </div>
              <div className="admin-list-info">
                {editing === p.id ? (
                  <div className="admin-inline-edit">
                    <input
                      className="admin-input"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && saveEdit(p.id)}
                      autoFocus
                    />
                    <button className="admin-btn-save small" onClick={() => saveEdit(p.id)}>✓</button>
                    <button className="admin-btn-cancel small" onClick={() => setEditing(null)}>✕</button>
                  </div>
                ) : (
                  <div className="admin-list-name">{p.name}</div>
                )}
              </div>
              <div className="admin-list-actions">
                <button className="admin-action-btn edit" onClick={() => { setEditing(p.id); setEditName(p.name); }}>✎</button>
                <button className="admin-action-btn delete" onClick={() => remove(p.id)}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Judges Tab ────────────────────────────────────────────────────────────
function JudgesTab() {
  const [judges,  setJudges]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [form,    setForm]    = useState({ name: "", avatar_url: "" });
  const [editing, setEditing] = useState(null);
  const [saving,  setSaving]  = useState(false);

  useEffect(() => { loadJudges(); }, []);

  async function loadJudges() {
    setLoading(true);
    const { data } = await supabase.from("judges").select("*").order("order_num");
    setJudges(data || []);
    setLoading(false);
  }

  async function save() {
    if (!form.name.trim()) return;
    setSaving(true);
    if (editing) {
      await supabase.from("judges").update({
        name:       form.name,
        avatar_url: form.avatar_url,
      }).eq("id", editing);
      setEditing(null);
    } else {
      await supabase.from("judges").insert({
        name:       form.name,
        avatar_url: form.avatar_url,
        order_num:  judges.length + 1,
      });
    }
    setForm({ name: "", avatar_url: "" });
    setSaving(false);
    loadJudges();
  }

  async function remove(id) {
    if (!confirm("Удалить судью? Все его оценки также будут удалены.")) return;
    await supabase.from("scores").delete().eq("judge_id", id);
    await supabase.from("judges").delete().eq("id", id);
    loadJudges();
  }

  function startEdit(j) {
    setEditing(j.id);
    setForm({ name: j.name, avatar_url: j.avatar_url || "" });
  }

  async function moveUp(idx) {
    if (idx === 0) return;
    const a = judges[idx], b = judges[idx - 1];
    await supabase.from("judges").update({ order_num: b.order_num }).eq("id", a.id);
    await supabase.from("judges").update({ order_num: a.order_num }).eq("id", b.id);
    loadJudges();
  }

  async function moveDown(idx) {
    if (idx === judges.length - 1) return;
    const a = judges[idx], b = judges[idx + 1];
    await supabase.from("judges").update({ order_num: b.order_num }).eq("id", a.id);
    await supabase.from("judges").update({ order_num: a.order_num }).eq("id", b.id);
    loadJudges();
  }

  return (
    <div className="admin-section">
      <div className="admin-form">
        <div className="admin-form-title">{editing ? "Редактировать судью" : "Новый судья"}</div>

        <div className="admin-form-row">
          <label className="admin-label">Имя</label>
          <input
            className="admin-input"
            placeholder="Имя судьи"
            value={form.name}
            onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
          />
        </div>

        <div className="admin-form-row">
          <label className="admin-label">URL фото</label>
          <input
            className="admin-input"
            placeholder="https://..."
            value={form.avatar_url}
            onChange={e => setForm(p => ({ ...p, avatar_url: e.target.value }))}
          />
        </div>

        {form.avatar_url && (
          <img
            src={form.avatar_url}
            alt="preview"
            className="admin-avatar-preview"
          />
        )}

        <div className="admin-form-btns">
          {editing && (
            <button className="admin-btn-cancel" onClick={() => { setEditing(null); setForm({ name: "", avatar_url: "" }); }}>
              Отмена
            </button>
          )}
          <button className="admin-btn-save" onClick={save} disabled={saving}>
            {saving ? "Сохранение..." : editing ? "Сохранить" : "+ Добавить судью"}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="admin-empty">Загрузка...</div>
      ) : judges.length === 0 ? (
        <div className="admin-empty">Судей пока нет</div>
      ) : (
        <div className="admin-list">
          {judges.map((j, idx) => (
            <div className="admin-list-item" key={j.id}>
              <div className="admin-list-order">
                <button className="admin-order-btn" onClick={() => moveUp(idx)} disabled={idx === 0}>↑</button>
                <button className="admin-order-btn" onClick={() => moveDown(idx)} disabled={idx === judges.length - 1}>↓</button>
              </div>
              {j.avatar_url
                ? <img className="admin-judge-avatar" src={j.avatar_url} alt={j.name} />
                : <div className="admin-judge-avatar-placeholder">{j.name[0]}</div>
              }
              <div className="admin-list-info">
                <div className="admin-list-name">{j.name}</div>
              </div>
              <div className="admin-list-actions">
                <button className="admin-action-btn edit" onClick={() => startEdit(j)}>✎</button>
                <button className="admin-action-btn delete" onClick={() => remove(j.id)}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}