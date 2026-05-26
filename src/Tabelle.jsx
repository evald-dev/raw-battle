import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";
import "./styles.css";
import "./tabelle.css";

// ── Supabase ──────────────────────────────────────────────────────────────
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Hilfsfunktionen ───────────────────────────────────────────────────────
function scoreColor(score, isKnockout) {
  if (score === null || score === undefined || score === "") return "";
  const n = Number(score);
  if (isKnockout) return n === 1 ? "score-green" : "score-red";
  if (n === 10) return "score-green";
  if (n === 0)  return "score-red";
  const pct = n / 10;
  if (pct < 0.5) return "score-orange";
  return "score-yellow";
}

export default function Tabelle() {
  const navigate = useNavigate();
  const bgVideoRef = useRef(null);

  // ── State ─────────────────────────────────────────────────────────────
  const [rounds,       setRounds]       = useState([]);
  const [activeRound,  setActiveRound]  = useState(null);
  const [participants, setParticipants] = useState([]);
  const [judges,       setJudges]       = useState([]);
  const [scores,       setScores]       = useState({});
  const [roundInfo,    setRoundInfo]    = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [sorted,       setSorted]       = useState(false);
  const [commentModal, setCommentModal] = useState(null);

  // ── Effects ───────────────────────────────────────────────────────────
  useEffect(() => {
    loadRounds();
  }, []);

  useEffect(() => {
    if (activeRound) loadRoundData(activeRound);
  }, [activeRound]);

  useEffect(() => {
    const video = bgVideoRef.current;
    if (!video) return;
    const handler = () => {
      video.currentTime = 0.01;
      video.play().catch(() => {});
    };
    video.addEventListener("ended", handler);
    return () => video.removeEventListener("ended", handler);
  }, []);

  // ── Daten laden ───────────────────────────────────────────────────────
  async function loadRounds() {
    const { data } = await supabase
      .from("rounds")
      .select("*")
      .order("order_num");
    if (data?.length) {
      setRounds(data);
      setActiveRound(data[0].id);
    }
    setLoading(false);
  }

  async function loadRoundData(roundId) {
    setLoading(true);
    setSorted(false);

    const [
      { data: roundData },
      { data: participantData },
      { data: judgeData },
      { data: scoreData },
    ] = await Promise.all([
      supabase.from("rounds").select("*").eq("id", roundId).single(),
      supabase.from("participants").select("*").eq("round_id", roundId).order("order_num"),
      supabase.from("judges").select("*").order("order_num"),
      supabase.from("scores").select("*").eq("round_id", roundId),
    ]);

    setRoundInfo(roundData);
    setParticipants(participantData || []);
    setJudges(judgeData || []);

    const scoreMap = {};
    (scoreData || []).forEach(s => {
      scoreMap[`${s.participant_id}_${s.judge_id}`] = {
        score: s.score,
        comment: s.comment || "",
      };
    });
    setScores(scoreMap);
    setLoading(false);
  }

  // ── Gesamtpunktzahl ───────────────────────────────────────────────────
  function totalScore(participantId) {
    return judges.reduce((sum, j) => {
      const key = `${participantId}_${j.id}`;
      const val = scores[key]?.score;
      return sum + (val !== null && val !== undefined && val !== "" ? Number(val) : 0);
    }, 0);
  }

  // ── Sortieren ─────────────────────────────────────────────────────────
  function getSortedParticipants() {
    if (!sorted) return participants;
    return [...participants].sort((a, b) => totalScore(b.id) - totalScore(a.id));
  }

  // ── Score speichern ───────────────────────────────────────────────────
  async function saveScore(participantId, judgeId, value) {
    const key = `${participantId}_${judgeId}`;
    const existing = scores[key];

    setScores(prev => ({
      ...prev,
      [key]: { ...prev[key], score: value },
    }));

    await supabase.from("scores").upsert({
      round_id:       activeRound,
      participant_id: participantId,
      judge_id:       judgeId,
      score:          value,
      comment:        existing?.comment || "",
    }, { onConflict: "round_id,participant_id,judge_id" });
  }

  // ── Kommentar speichern ───────────────────────────────────────────────
  async function saveComment(participantId, judgeId, comment) {
    const key = `${participantId}_${judgeId}`;
    const existing = scores[key];

    setScores(prev => ({
      ...prev,
      [key]: { ...prev[key], comment },
    }));

    await supabase.from("scores").upsert({
      round_id:       activeRound,
      participant_id: participantId,
      judge_id:       judgeId,
      score:          existing?.score ?? null,
      comment,
    }, { onConflict: "round_id,participant_id,judge_id" });

    setCommentModal(null);
  }

  // ── Hilfswerte ────────────────────────────────────────────────────────
  const isKnockout = roundInfo?.type === "knockout";
  const ranked = [...participants].sort((a, b) => totalScore(b.id) - totalScore(a.id));

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <>
      <div className="video-bg" aria-hidden="true">
        <video ref={bgVideoRef} autoPlay muted playsInline preload="auto">
          <source src="videos/tv-noise.mp4" type="video/mp4" />
        </video>
      </div>

      <div className="top-marquee" aria-hidden="true">
        <div className="top-marquee-track">
          0.49 GERMANY • СЫРОЙ БАТЛ • ПЕРВЫЙ ОТБОРОЧНЫЙ РАУНД • 0.49 GERMANY • СЫРОЙ БАТЛ • ПЕРВЫЙ ОТБОРОЧНЫЙ РАУНД •
        </div>
      </div>

      <main className="tabelle-layout">
        <button className="tabelle-back" onClick={() => window.location.href = "/raw-battle/"}>← zurück</button>

        {/* ── Header ── */}
        <div className="tabelle-header">
          <div className="tabelle-title">0.49 — СЫРОЙ БАТЛ</div>
          <div className="tabelle-heading">Таблица участников</div>
        </div>

        {/* ── Rundeninfo ── */}
        {roundInfo && (
          <div className="tabelle-round-info">
            {roundInfo.visual_url && (
              <img className="tabelle-round-visual" src={roundInfo.visual_url} alt="Раунд" />
            )}
            {roundInfo.extra_info && (
              <p className="tabelle-round-extra">{roundInfo.extra_info}</p>
            )}
          </div>
        )}

        {/* ── Runden-Tabs ── */}
        <div className="tabelle-round-tabs">
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

        {loading ? (
          <div className="tabelle-empty">Загрузка...</div>
        ) : participants.length === 0 ? (
          <div className="tabelle-empty">Данные ещё не добавлены</div>
        ) : (
          <>
            {/* ── Podium ── */}
            {!isKnockout && ranked.length >= 3 && (
              <div className="tabelle-podium">
                <div className="tabelle-podium-item gold">
                  <span className="tabelle-podium-place">1</span>
                  <span className="tabelle-podium-name">{ranked[0]?.name}</span>
                </div>
                <div className="tabelle-podium-item silver">
                  <span className="tabelle-podium-place">2</span>
                  <span className="tabelle-podium-name">{ranked[1]?.name}</span>
                </div>
                <div className="tabelle-podium-item bronze">
                  <span className="tabelle-podium-place">3</span>
                  <span className="tabelle-podium-name">{ranked[2]?.name}</span>
                </div>
              </div>
            )}

            {/* ── Richter-Header ── */}
            <div className="tabelle-judges-header">
              {judges.map(j => (
                <div className="tabelle-judge-card" key={j.id}>
                  {j.avatar_url
                    ? <img className="tabelle-judge-avatar" src={j.avatar_url} alt={j.name} />
                    : <div className="tabelle-judge-avatar-placeholder">{j.name[0]}</div>
                  }
                  <div className="tabelle-judge-name">{j.name}</div>
                  <div className="tabelle-judge-progress">
                    {participants.filter(p =>
                      scores[`${p.id}_${j.id}`]?.score !== undefined &&
                      scores[`${p.id}_${j.id}`]?.score !== ""
                    ).length}/{participants.length}
                  </div>
                </div>
              ))}
            </div>

            {/* ── Sortier-Button ── */}
            {!isKnockout && (
              <button
                className={`tabelle-sort-btn${sorted ? " active" : ""}`}
                onClick={() => setSorted(s => !s)}
              >
                {sorted ? "✕ Сортировка отключена" : "↓ Сортировать по баллам"}
              </button>
            )}

            {/* ── Tabelle ── */}
            <div className="tabelle-scroll">
              <table className="tabelle-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Участник</th>
                    {!isKnockout && <th>Сумма</th>}
                    {judges.map(j => (
                      <th key={j.id}>{j.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {getSortedParticipants().map((p, idx) => (
                    <tr key={p.id}>
                      <td className="tabelle-rank">{idx + 1}</td>
                      <td className="tabelle-participant-name">{p.name}</td>
                      {!isKnockout && (
                        <td className="tabelle-total">{totalScore(p.id)}</td>
                      )}
                      {judges.map(j => {
                        const key = `${p.id}_${j.id}`;
                        const entry = scores[key];
                        const val = entry?.score;
                        const hasComment = entry?.comment;
                        return (
                          <td key={j.id} className={`tabelle-score-cell ${scoreColor(val, isKnockout)}`}>
                            {isKnockout ? (
                              <div className="tabelle-knockout-btns">
                                <button
                                  className={`tabelle-ko-btn${val === 1 ? " selected" : ""}`}
                                  onClick={() => saveScore(p.id, j.id, 1)}
                                >✓</button>
                                <button
                                  className={`tabelle-ko-btn loss${val === 0 ? " selected" : ""}`}
                                  onClick={() => saveScore(p.id, j.id, 0)}
                                >✕</button>
                              </div>
                            ) : (
                              <input
                                className="tabelle-score-input"
                                type="number"
                                min="0"
                                max="10"
                                value={val ?? ""}
                                onChange={e => {
                                  const v = e.target.value === "" ? null : Math.min(10, Math.max(0, Number(e.target.value)));
                                  saveScore(p.id, j.id, v);
                                }}
                              />
                            )}
                            <button
                              className={`tabelle-comment-btn${hasComment ? " has-comment" : ""}`}
                              title={hasComment || "Добавить комментарий"}
                              onClick={() => setCommentModal({ participantId: p.id, judgeId: j.id, value: entry?.comment || "" })}
                            >
                              {hasComment ? "💬" : "+"}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>

      {/* ── Kommentar-Modal ── */}
      {commentModal && (
        <>
          <div className="tabelle-modal-backdrop" onClick={() => setCommentModal(null)} />
          <div className="tabelle-modal">
            <div className="tabelle-modal-title">Комментарий судьи</div>
            <textarea
              className="tabelle-modal-textarea"
              value={commentModal.value}
              onChange={e => setCommentModal(prev => ({ ...prev, value: e.target.value }))}
              placeholder="Введите комментарий..."
              rows={5}
            />
            <div className="tabelle-modal-btns">
              <button className="tabelle-modal-cancel" onClick={() => setCommentModal(null)}>Отмена</button>
              <button
                className="tabelle-modal-save"
                onClick={() => saveComment(commentModal.participantId, commentModal.judgeId, commentModal.value)}
              >
                Сохранить
              </button>
            </div>
          </div>
        </>
      )}

      <footer className="site-footer">
        <div className="site-footer-links">
          <button className="footer-modal-link" type="button" onClick={() => window.location.href = "/raw-battle/"}>
            ← Самплер
          </button>
        </div>
      </footer>
    </>
  );
}