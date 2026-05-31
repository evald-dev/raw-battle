import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import "./styles.css";

// ── Supabase ──────────────────────────────────────────────────────────────
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Hintergrundfarbe ──────────────────────────────────────────────────────
const BG = "bg-[oklch(26.9%_0_0/0.8)]";
// ── Hilfsfunktionen ───────────────────────────────────────────────────────
function scoreColor(score, isKnockout) {
  if (score === null || score === undefined || score === "") return "";
  const n = Number(score);
  if (isKnockout) return n === 1 ? "bg-emerald-500/25" : "bg-[#d94b6a]/25";
  if (n <= 3) return "bg-[#d94b6a]/25";
  if (n <= 6) return "bg-yellow-500/25";
  if (n <= 8) return "bg-lime-500/25";
  return "bg-emerald-500/25";
}

export default function Tabelle() {
  const bgVideoRef = useRef(null);

  const [rounds,       setRounds]       = useState([]);
  const [activeRound,  setActiveRound]  = useState(null);
  const [participants, setParticipants] = useState([]);
  const [judges,       setJudges]       = useState([]);
  const [scores,       setScores]       = useState({});
  const [roundInfo,    setRoundInfo]    = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [sorted,       setSorted]       = useState(false);
  const [commentModal, setCommentModal] = useState(null);

  useEffect(() => { loadRounds(); }, []);
  useEffect(() => { if (activeRound) loadRoundData(activeRound); }, [activeRound]);

  useEffect(() => {
    const video = bgVideoRef.current;
    if (!video) return;
    const handler = () => { video.currentTime = 0.01; video.play().catch(() => {}); };
    video.addEventListener("ended", handler);
    return () => video.removeEventListener("ended", handler);
  }, []);

  async function loadRounds() {
    const { data } = await supabase.from("rounds").select("*").order("order_num");
    if (data?.length) { setRounds(data); setActiveRound(data[0].id); }
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
      scoreMap[`${s.participant_id}_${s.judge_id}`] = { score: s.score, comment: s.comment || "" };
    });
    setScores(scoreMap);
    setLoading(false);
  }

  function totalScore(participantId) {
    return judges.reduce((sum, j) => {
      const val = scores[`${participantId}_${j.id}`]?.score;
      return sum + (val !== null && val !== undefined && val !== "" ? Number(val) : 0);
    }, 0);
  }

  function getSortedParticipants() {
    if (!sorted) return participants;
    return [...participants].sort((a, b) => totalScore(b.id) - totalScore(a.id));
  }

  async function saveScore(participantId, judgeId, value) {
    const existing = scores[`${participantId}_${judgeId}`];
    setScores(prev => ({ ...prev, [`${participantId}_${judgeId}`]: { ...prev[`${participantId}_${judgeId}`], score: value } }));
    await supabase.from("scores").upsert({
      round_id: activeRound, participant_id: participantId, judge_id: judgeId,
      score: value, comment: existing?.comment || "",
    }, { onConflict: "round_id,participant_id,judge_id" });
  }

  async function saveComment(participantId, judgeId, comment) {
    const existing = scores[`${participantId}_${judgeId}`];
    setScores(prev => ({ ...prev, [`${participantId}_${judgeId}`]: { ...prev[`${participantId}_${judgeId}`], comment } }));
    await supabase.from("scores").upsert({
      round_id: activeRound, participant_id: participantId, judge_id: judgeId,
      score: existing?.score ?? null, comment,
    }, { onConflict: "round_id,participant_id,judge_id" });
    setCommentModal(null);
  }

  const isKnockout = roundInfo?.type === "knockout";
  const ranked = [...participants].sort((a, b) => totalScore(b.id) - totalScore(a.id));

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

      <main className="relative z-10 max-w-[1100px] mx-auto px-4 pt-20 pb-20">

        {/* ── Zurück ── */}
        <button
          onClick={() => window.location.href = "/raw-battle/"}
          className={`mb-7 inline-flex items-center gap-2 ${BG} border border-white/[0.1] rounded-full px-4 py-1.5 font-[Montserrat] text-[11px] font-bold tracking-[0.12em] uppercase text-[rgba(245,232,207,0.45)] cursor-pointer transition-colors duration-150 hover:text-[#f5e8cf] hover:bg-white/[0.1]`}
        >
          ← zurück
        </button>

        {/* ── Header ── */}
        <div className="mb-5">
          <div className="font-[Montserrat] text-[11px] tracking-[0.18em] uppercase text-[rgba(245,232,207,0.35)] mb-1.5">
            0.49 — СЫРОЙ БАТЛ
          </div>
          <div className="font-[Montserrat] text-[26px] font-bold tracking-[0.04em] text-[#f5e8cf]">
            Таблица участников
          </div>
        </div>

        {/* ── Rundeninfo ── */}
        {roundInfo && (roundInfo.visual_url || roundInfo.extra_info) && (
          <div className="flex items-start gap-5 mb-6 flex-wrap">
            {roundInfo.visual_url && (
              <img src={roundInfo.visual_url} alt="Раунд" className="max-w-[200px] rounded-lg border border-white/10" />
            )}
            {roundInfo.extra_info && (
              <p className="font-[Montserrat] text-[13px] text-[rgba(245,232,207,0.6)] leading-[1.65] m-0">{roundInfo.extra_info}</p>
            )}
          </div>
        )}

        {/* ── Runden-Tabs ── */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {rounds.map(r => (
            <button
              key={r.id}
              onClick={() => setActiveRound(r.id)}
              className={`px-4 py-1.5 rounded-full border font-[Montserrat] text-[11px] font-bold tracking-[0.1em] uppercase cursor-pointer transition-all duration-150
                ${activeRound === r.id
                  ? "border-[#d94b6a] bg-[rgba(217,75,106,0.12)] text-[#f5e8cf]"
                  : `border-white/[0.12] ${BG} text-[rgba(245,232,207,0.45)] hover:text-[#f5e8cf] hover:bg-white/[0.1]`
                }`}
            >
              {r.name}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-16 font-[Montserrat] text-[13px] tracking-[0.1em] uppercase text-[rgba(245,232,207,0.25)]">
            Загрузка...
          </div>
        ) : participants.length === 0 ? (
          <div className="text-center py-16 font-[Montserrat] text-[13px] tracking-[0.1em] uppercase text-[rgba(245,232,207,0.25)]">
            Данные ещё не добавлены
          </div>
        ) : (
          <>
            {/* ── Podium ── */}
            {!isKnockout && ranked.length >= 3 && (
              <div className="flex gap-3 mb-6 flex-wrap">
                {[
                  { item: ranked[0], place: "1", borderColor: "border-[rgba(255,200,0,0.3)]",   placeColor: "text-[#ffc800]" },
                  { item: ranked[1], place: "2", borderColor: "border-[rgba(180,180,180,0.3)]", placeColor: "text-[#b4b4b4]" },
                  { item: ranked[2], place: "3", borderColor: "border-[rgba(180,100,30,0.3)]",  placeColor: "text-[#b4641e]" },
                ].map(({ item, place, borderColor, placeColor }) => (
                  <div key={place} className={`flex items-center gap-2.5 px-4 py-2.5 rounded-lg border ${BG} font-[Montserrat] ${borderColor}`}>
                    <span className={`text-lg font-bold ${placeColor}`}>{place}</span>
                    <span className="text-[13px] font-bold text-[#f5e8cf] tracking-[0.06em] uppercase">{item?.name}</span>
                  </div>
                ))}
              </div>
            )}

            {/* ── Richter-Header ── */}
            <div className="flex gap-3 mb-4 flex-wrap">
              {judges.map(j => (
                <div key={j.id} className={`flex flex-col items-center gap-1.5 px-3.5 py-2.5 ${BG} border border-white/[0.12] rounded-lg min-w-[80px]`}>
                  {j.avatar_url
                    ? <img src={j.avatar_url} alt={j.name} className="w-[42px] h-[42px] rounded-full object-cover border-2 border-[#d94b6a]" />
                    : <div className="w-[42px] h-[42px] rounded-full bg-[rgba(217,75,106,0.15)] border-2 border-[rgba(217,75,106,0.3)] flex items-center justify-center text-base font-bold text-[#d94b6a] font-[Montserrat]">{j.name[0]}</div>
                  }
                  <div className="font-[Montserrat] text-[11px] font-bold text-[#f5e8cf] tracking-[0.06em] uppercase text-center">{j.name}</div>
                  <div className="font-[Montserrat] text-[10px] text-[rgba(245,232,207,0.4)]">
                    {participants.filter(p => {
  const val = scores[`${p.id}_${j.id}`]?.score;
  return val !== null && val !== undefined && val !== "";
}).length}/{participants.length}
                  </div>
                </div>
              ))}
            </div>

            {/* ── Sortier-Button ── */}
            {!isKnockout && (
              <button
                onClick={() => setSorted(s => !s)}
                className={`mb-4 px-4 py-2 rounded-full border font-[Montserrat] text-[11px] font-bold tracking-[0.1em] uppercase cursor-pointer transition-all duration-150 block
                  ${sorted
                    ? "border-[#d94b6a] text-[#d94b6a] bg-[rgba(217,75)]"
                    : `border-white/[0.15] text-[rgba(245,232,207)] ${BG} hover:text-[#f5e8cf] hover:border-white/30 hover:bg-white/[0.1]`
                  }`}
              >
                {sorted ? "✕ Сортировка отключена" : "↓ Сортировать по баллам"}
              </button>
            )}

            {/* ── Tabelle ── */}
            <div className="overflow-x-auto [-webkit-overflow-scrolling:touch]">
              <table className="w-full border-collapse font-[Montserrat] min-w-[500px]">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="px-3 py-2.5 text-[10px] tracking-[0.12em] uppercase text-[rgba(245,232,207)] font-bold text-left whitespace-nowrap">#</th>
                    <th className="px-3 py-2.5 text-[10px] tracking-[0.12em] uppercase text-[rgba(245,232,207)] font-bold text-left whitespace-nowrap">Участник</th>
                    {!isKnockout && <th className="px-3 py-2.5 text-[10px] tracking-[0.12em] uppercase text-[rgba(245,232,207)] font-bold text-center whitespace-nowrap">Сумма</th>}
                    {judges.map(j => (
                      <th key={j.id} className="px-3 py-2.5 text-[10px] tracking-[0.12em] uppercase text-[rgba(245,232,207)] font-bold text-center whitespace-nowrap">{j.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {getSortedParticipants().map((p, idx) => (
                    <tr key={p.id} className={`border-b border-white/[0.05] last:border-b-0 ${BG}`}>
                      <td className="px-3 py-2.5 text-[12px] text-[rgba(245,232,207)] font-bold w-8 align-middle">{idx + 1}</td>
                      <td className="px-3 py-2.5 text-[13px] font-bold text-[#f5e8cf] tracking-[0.04em] uppercase whitespace-nowrap align-middle">{p.name}</td>
                      {!isKnockout && (
                        <td className="px-3 py-2.5 text-[14px] font-bold text-[#f5e8cf] text-center min-w-[48px] align-middle">{totalScore(p.id)}</td>
                      )}
                      {judges.map(j => {
                        const key = `${p.id}_${j.id}`;
                        const entry = scores[key];
                        const val = entry?.score;
                        const hasComment = entry?.comment;
                        return (
                          <td key={j.id} className={`px-3 py-2.5 relative min-w-[70px] text-center align-middle transition-colors duration-200 ${scoreColor(val, isKnockout)}`}>
                            {isKnockout ? (
                              <div className="flex gap-1 justify-center">
                                <button
                                  onClick={() => saveScore(p.id, j.id, 1)}
                                  className={`w-7 h-7 rounded-full border text-[13px] cursor-pointer flex items-center justify-center transition-all duration-150
                                    ${val === 1 ? "bg-emerald-500/30 border-emerald-500 text-emerald-500" : `border-white/15 ${BG} text-[rgba(245,232,207,0.5)]`}`}
                                >✓</button>
                                <button
                                  onClick={() => saveScore(p.id, j.id, 0)}
                                  className={`w-7 h-7 rounded-full border text-[13px] cursor-pointer flex items-center justify-center transition-all duration-150
                                    ${val === 0 ? "bg-[rgba(217,75,106)] border-[#d94b6a] text-[#d94b6a]" : `border-white/15 ${BG} text-[rgba(245,232,207,0.5)]`}`}
                                >✕</button>
                              </div>
                            ) : (
                              <input
                                type="number"
                                min="0"
                                max="10"
                                value={val ?? ""}
                                onChange={e => {
                                  const v = e.target.value === "" ? null : Math.min(10, Math.max(0, Number(e.target.value)));
                                  saveScore(p.id, j.id, v);
                                }}
                                className={`w-11 ${BG} border border-white/[0.15] rounded text-[#f5e8cf] font-[Montserrat] text-[13px] font-bold text-center p-1 outline-none transition-colors duration-150 focus:border-[#d94b6a] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
                              />
                            )}
                            <button
                              onClick={() => setCommentModal({ participantId: p.id, judgeId: j.id, value: entry?.comment || "" })}
                              title={hasComment || "Добавить комментарий"}
                              className={`absolute top-1 right-1 w-[18px] h-[18px] rounded-full border-0 text-[10px] cursor-pointer flex items-center justify-center p-0 transition-all duration-150
                                ${hasComment ? "text-[#f6d77a] bg-[rgba(246,215,122,0.12)]" : `text-[rgba(245,232,207,0.4)] ${BG} hover:bg-white/[0.15]`}`}
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
          <div
            onClick={() => setCommentModal(null)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200]"
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[201] bg-[rgba(10,10,12,0.98)] border border-white/[0.12] rounded-xl p-7 w-[min(92vw,440px)]">
            <div className="font-[Montserrat] text-[13px] font-bold tracking-[0.1em] uppercase text-[#f5e8cf] mb-4">
              Комментарий судьи
            </div>
            <textarea
              value={commentModal.value}
              onChange={e => setCommentModal(prev => ({ ...prev, value: e.target.value }))}
              placeholder="Введите комментарий..."
              rows={5}
              className={`w-full ${BG} border border-white/[0.15] rounded-lg text-[#f5e8cf] font-[Montserrat] text-[13px] leading-[1.6] p-3 outline-none resize-y mb-4 focus:border-[#d94b6a] transition-colors`}
            />
            <div className="flex gap-2.5 justify-end">
              <button
                onClick={() => setCommentModal(null)}
                className={`px-4 py-2 rounded-full border border-white/[0.12] ${BG} text-[rgba(245,232,207,0.5)] font-[Montserrat] text-[11px] font-bold tracking-[0.1em] uppercase cursor-pointer transition-all hover:text-[#f5e8cf] hover:bg-white/[0.1]`}
              >
                Отмена
              </button>
              <button
                onClick={() => saveComment(commentModal.participantId, commentModal.judgeId, commentModal.value)}
                className="px-4 py-2 rounded-full border border-[#d94b6a] bg-[rgba(217,75,106,0.15)] text-[#f5e8cf] font-[Montserrat] text-[11px] font-bold tracking-[0.1em] uppercase cursor-pointer transition-all hover:bg-[rgba(217,75,106,0.3)]"
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