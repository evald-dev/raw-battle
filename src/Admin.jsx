import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "./supabase";
import { useAuth } from "./AuthContext";
import "./styles.css";
import "./admin.css";

const TABS = ["Раунды", "Участники", "Судьи", "Пользователи", "Видимость"];

export default function Admin() {
  const { signOut } = useAuth();
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
          <button className="tabelle-back" onClick={() => navigate("/")}>← zurück</button>
          <div className="admin-title">Admin Panel</div>
          <button
            onClick={signOut}
            className="ml-auto px-4 py-1.5 rounded-full border border-white/[0.12] bg-white/[0.06] text-[rgba(245,232,207,0.45)] font-[Montserrat] text-[11px] font-bold tracking-[0.1em] uppercase cursor-pointer transition-all hover:text-[#f5e8cf]"
          >
            Выйти
          </button>
        </div>

        <div className="admin-tabs">
          {TABS.map(t => (
            <button key={t} className={`admin-tab${activeTab === t ? " active" : ""}`} onClick={() => setActiveTab(t)}>
              {t}
            </button>
          ))}
        </div>

        <div className="admin-content">
          {activeTab === "Раунды"       && <RoundsTab />}
          {activeTab === "Участники"    && <ParticipantsTab />}
          {activeTab === "Судьи"        && <JudgesTab />}
          {activeTab === "Пользователи" && <UsersTab />}
          {activeTab === "Видимость"    && <VisibilityTab />}
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
      await supabase.from("rounds").update({ name: form.name, type: form.type, extra_info: form.extra_info, visual_url: form.visual_url }).eq("id", editing);
      setEditing(null);
    } else {
      await supabase.from("rounds").insert({ name: form.name, type: form.type, extra_info: form.extra_info, visual_url: form.visual_url, order_num: rounds.length + 1 });
    }
    setForm({ name: "", type: "qualifying", extra_info: "", visual_url: "" });
    setSaving(false);
    loadRounds();
  }

  async function deleteRound(id) {
    if (!confirm("Удалить раунд? Все оценки также будут удалены.")) return;
    await supabase.from("scores").delete().eq("round_id", id);
    await supabase.from("favorites").delete().eq("round_id", id);
    await supabase.from("participants").delete().eq("round_id", id);
    await supabase.from("rounds").delete().eq("id", id);
    loadRounds();
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
          <input className="admin-input" placeholder="Раунд 1" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
        </div>
        <div className="admin-form-row">
          <label className="admin-label">Тип</label>
          <select className="admin-input" value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
            <option value="qualifying">Отборочный (0–10)</option>
            <option value="knockout">Нокаут (победитель/проигравший)</option>
          </select>
        </div>
        <div className="admin-form-row">
          <label className="admin-label">Доп. информация</label>
          <textarea className="admin-input admin-textarea" placeholder="Тема раунда..." value={form.extra_info} onChange={e => setForm(p => ({ ...p, extra_info: e.target.value }))} rows={3} />
        </div>
        <div className="admin-form-row">
          <label className="admin-label">URL визуала</label>
          <input className="admin-input" placeholder="https://..." value={form.visual_url} onChange={e => setForm(p => ({ ...p, visual_url: e.target.value }))} />
        </div>
        <div className="admin-form-btns">
          {editing && <button className="admin-btn-cancel" onClick={() => { setEditing(null); setForm({ name: "", type: "qualifying", extra_info: "", visual_url: "" }); }}>Отмена</button>}
          <button className="admin-btn-save" onClick={save} disabled={saving}>{saving ? "Сохранение..." : editing ? "Сохранить" : "+ Добавить раунд"}</button>
        </div>
      </div>

      {loading ? <div className="admin-empty">Загрузка...</div> : rounds.length === 0 ? <div className="admin-empty">Раундов пока нет</div> : (
        <div className="admin-list">
          {rounds.map((r, idx) => (
            <div className="admin-list-item" key={r.id}>
              <div className="admin-list-order">
                <button className="admin-order-btn" onClick={() => moveUp(idx)} disabled={idx === 0}>↑</button>
                <button className="admin-order-btn" onClick={() => moveDown(idx)} disabled={idx === rounds.length - 1}>↓</button>
              </div>
              <div className="admin-list-info">
                <div className="admin-list-name">{r.name}</div>
                <div className="admin-list-meta">{r.type === "knockout" ? "Нокаут" : "Отборочный"}{r.extra_info && ` · ${r.extra_info.slice(0, 40)}`}</div>
              </div>
              <div className="admin-list-actions">
                <button className="admin-action-btn edit" onClick={() => { setEditing(r.id); setForm({ name: r.name, type: r.type, extra_info: r.extra_info || "", visual_url: r.visual_url || "" }); }}>✎</button>
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
  const [rounds, setRounds] = useState([]);
  const [activeRound, setActiveRound] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const [editName, setEditName] = useState("");

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
    const { data } = await supabase.from("participants").select("*").eq("round_id", roundId).order("order_num");
    setParticipants(data || []);
    setLoading(false);
  }

  async function add() {
    if (!name.trim() || !activeRound) return;
    setSaving(true);
    await supabase.from("participants").insert({ name: name.trim(), round_id: activeRound, order_num: participants.length + 1 });
    setName("");
    setSaving(false);
    loadParticipants(activeRound);
  }

  async function remove(id) {
    if (!confirm("Удалить участника? Все его оценки также будут удалены.")) return;
    await supabase.from("scores").delete().eq("participant_id", id);
    await supabase.from("favorites").delete().eq("participant_id", id);
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
      <div className="admin-round-select">
        {rounds.map(r => (
          <button key={r.id} className={`tabelle-round-tab${activeRound === r.id ? " active" : ""}`} onClick={() => setActiveRound(r.id)}>{r.name}</button>
        ))}
      </div>
      <div className="admin-form">
        <div className="admin-form-title">Новый участник</div>
        <div className="admin-form-row admin-form-inline">
          <input className="admin-input" placeholder="Имя участника" value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === "Enter" && add()} />
          <button className="admin-btn-save" onClick={add} disabled={saving || !name.trim()}>{saving ? "..." : "+ Добавить"}</button>
        </div>
      </div>
      {loading ? <div className="admin-empty">Загрузка...</div> : participants.length === 0 ? <div className="admin-empty">Участников пока нет</div> : (
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
                    <input className="admin-input" value={editName} onChange={e => setEditName(e.target.value)} onKeyDown={e => e.key === "Enter" && saveEdit(p.id)} autoFocus />
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
  const [judges, setJudges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", avatar_url: "" });
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

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
      await supabase.from("judges").update({ name: form.name, avatar_url: form.avatar_url }).eq("id", editing);
      setEditing(null);
    } else {
      await supabase.from("judges").insert({ name: form.name, avatar_url: form.avatar_url, order_num: judges.length + 1 });
    }
    setForm({ name: "", avatar_url: "" });
    setSaving(false);
    loadJudges();
  }

  async function remove(id) {
    if (!confirm("Удалить судью? Все его оценки также будут удалены.")) return;
    await supabase.from("scores").delete().eq("judge_id", id);
    await supabase.from("favorites").delete().eq("judge_id", id);
    await supabase.from("judges").delete().eq("id", id);
    loadJudges();
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
          <input className="admin-input" placeholder="Имя судьи" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
        </div>
        <div className="admin-form-row">
          <label className="admin-label">URL фото</label>
          <input className="admin-input" placeholder="https://..." value={form.avatar_url} onChange={e => setForm(p => ({ ...p, avatar_url: e.target.value }))} />
        </div>
        {form.avatar_url && <img src={form.avatar_url} alt="preview" className="admin-avatar-preview" />}
        <div className="admin-form-btns">
          {editing && <button className="admin-btn-cancel" onClick={() => { setEditing(null); setForm({ name: "", avatar_url: "" }); }}>Отмена</button>}
          <button className="admin-btn-save" onClick={save} disabled={saving}>{saving ? "Сохранение..." : editing ? "Сохранить" : "+ Добавить судью"}</button>
        </div>
      </div>
      {loading ? <div className="admin-empty">Загрузка...</div> : judges.length === 0 ? <div className="admin-empty">Судей пока нет</div> : (
        <div className="admin-list">
          {judges.map((j, idx) => (
            <div className="admin-list-item" key={j.id}>
              <div className="admin-list-order">
                <button className="admin-order-btn" onClick={() => moveUp(idx)} disabled={idx === 0}>↑</button>
                <button className="admin-order-btn" onClick={() => moveDown(idx)} disabled={idx === judges.length - 1}>↓</button>
              </div>
              {j.avatar_url ? <img className="admin-judge-avatar" src={j.avatar_url} alt={j.name} /> : <div className="admin-judge-avatar-placeholder">{j.name[0]}</div>}
              <div className="admin-list-info"><div className="admin-list-name">{j.name}</div></div>
              <div className="admin-list-actions">
                <button className="admin-action-btn edit" onClick={() => { setEditing(j.id); setForm({ name: j.name, avatar_url: j.avatar_url || "" }); }}>✎</button>
                <button className="admin-action-btn delete" onClick={() => remove(j.id)}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Users Tab ─────────────────────────────────────────────────────────────
function UsersTab() {
  const [users,   setUsers]   = useState([]);
  const [judges,  setJudges]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState(null);
  const [form,    setForm]    = useState({ email: "", password: "", role: "judge", judge_id: "" });

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const [{ data: userData }, { data: judgeData }] = await Promise.all([
      supabase.from("user_roles").select("*, judges(name)"),
      supabase.from("judges").select("*").order("order_num"),
    ]);
    setUsers(userData || []);
    setJudges(judgeData || []);
    setLoading(false);
  }

  async function createUser() {
    if (!form.email || !form.password) return;
    if (form.role === "judge" && !form.judge_id) { setError("Выберите судью"); return; }
    setSaving(true);
    setError(null);

    // User über Admin API anlegen (benötigt service_role key — hier über Edge Function)
    const { data, error: signUpError } = await supabase.functions.invoke("create-user", {
      body: { email: form.email, password: form.password, role: form.role, judge_id: form.judge_id || null },
    });

    if (signUpError || data?.error) {
      setError(signUpError?.message || data?.error || "Ошибка при создании пользователя");
      setSaving(false);
      return;
    }

    setForm({ email: "", password: "", role: "judge", judge_id: "" });
    setSaving(false);
    loadData();
  }

  async function deleteUser(userId) {
    if (!confirm("Удалить пользователя?")) return;
    await supabase.from("user_roles").delete().eq("user_id", userId);
    // Auth-User löschen über Edge Function
    await supabase.functions.invoke("delete-user", { body: { user_id: userId } });
    loadData();
  }

  return (
    <div className="admin-section">
      <div className="admin-form">
        <div className="admin-form-title">Новый пользователь</div>

        <div className="admin-form-row">
          <label className="admin-label">Email</label>
          <input className="admin-input" type="email" placeholder="judge@example.com" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
        </div>

        <div className="admin-form-row">
          <label className="admin-label">Пароль</label>
          <input className="admin-input" type="password" placeholder="••••••••" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} />
        </div>

        <div className="admin-form-row">
          <label className="admin-label">Роль</label>
          <select className="admin-input" value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value, judge_id: "" }))}>
            <option value="judge">Судья</option>
            <option value="admin">Администратор</option>
          </select>
        </div>

        {form.role === "judge" && (
          <div className="admin-form-row">
            <label className="admin-label">Связать с судьёй</label>
            <select className="admin-input" value={form.judge_id} onChange={e => setForm(p => ({ ...p, judge_id: e.target.value }))}>
              <option value="">— Выберите судью —</option>
              {judges.map(j => <option key={j.id} value={j.id}>{j.name}</option>)}
            </select>
          </div>
        )}

        {error && <div className="font-[Montserrat] text-[12px] text-[#d94b6a]">{error}</div>}

        <div className="admin-form-btns">
          <button className="admin-btn-save" onClick={createUser} disabled={saving}>
            {saving ? "Создание..." : "+ Создать пользователя"}
          </button>
        </div>

        <div className="admin-list-meta" style={{ marginTop: 8, fontSize: 11 }}>
          ⚠ Для создания пользователей необходима Edge Function «create-user» с service_role ключом
        </div>
      </div>

      {loading ? <div className="admin-empty">Загрузка...</div> : users.length === 0 ? <div className="admin-empty">Пользователей пока нет</div> : (
        <div className="admin-list">
          {users.map(u => (
            <div className="admin-list-item" key={u.user_id}>
              <div className="admin-list-info">
                <div className="admin-list-name">{u.role === "admin" ? "👑 Admin" : `⚖ ${u.judges?.name || "Судья"}`}</div>
                <div className="admin-list-meta">{u.user_id}</div>
              </div>
              <div className="admin-list-actions">
                <button className="admin-action-btn delete" onClick={() => deleteUser(u.user_id)}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Visibility Tab ────────────────────────────────────────────────────────
function VisibilityTab() {
  const [rounds,  setRounds]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(null);

  useEffect(() => { loadRounds(); }, []);

  async function loadRounds() {
    setLoading(true);
    const { data } = await supabase.from("rounds").select("id, name, is_public").order("order_num");
    setRounds(data || []);
    setLoading(false);
  }

  async function toggleVisibility(roundId, current) {
    setSaving(roundId);
    await supabase.from("rounds").update({ is_public: !current }).eq("id", roundId);
    setRounds(prev => prev.map(r => r.id === roundId ? { ...r, is_public: !current } : r));
    setSaving(null);
  }

  return (
    <div className="admin-section">
      <div className="admin-form">
        <div className="admin-form-title">Видимость таблицы</div>
        <p className="admin-list-meta" style={{ marginBottom: 0, fontSize: 12, lineHeight: 1.6 }}>
          Включите видимость раунда чтобы публичная таблица показывала результаты для всех пользователей (без входа в систему).
        </p>
      </div>

      {loading ? <div className="admin-empty">Загрузка...</div> : rounds.length === 0 ? <div className="admin-empty">Раундов пока нет</div> : (
        <div className="admin-list">
          {rounds.map(r => (
            <div className="admin-list-item" key={r.id}>
              <div className="admin-list-info">
                <div className="admin-list-name">{r.name}</div>
                <div className="admin-list-meta">{r.is_public ? "✓ Публичный" : "✕ Скрытый"}</div>
              </div>
              <button
                onClick={() => toggleVisibility(r.id, r.is_public)}
                disabled={saving === r.id}
                className={`px-4 py-1.5 rounded-full border font-[Montserrat] text-[11px] font-bold tracking-[0.1em] uppercase cursor-pointer transition-all
                  ${r.is_public
                    ? "border-[#d94b6a] bg-[rgba(217,75,106,0.12)] text-[#d94b6a] hover:bg-[rgba(217,75,106,0.25)]"
                    : "border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                  } disabled:opacity-50`}
              >
                {saving === r.id ? "..." : r.is_public ? "Скрыть" : "Опубликовать"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}