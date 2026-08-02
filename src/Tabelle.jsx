import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import "./styles.css";
// ── Supabase ──────────────────────────────────────────────────────────────
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
// ── Hintergrundfarbe ──────────────────────────────────────────────────────
const BG = "bg-[oklch(26.9%_0_0/0.8)]";
const RANK_COLORS = {
  1: {
    border: "border-[rgba(255,200,0,0.5)]",
    text: "text-[#ffc800]",
    bg: "bg-[rgba(255,200,0,0.08)]",
  },
  2: {
    border: "border-[rgba(180,180,180,0.5)]",
    text: "text-[#b4b4b4]",
    bg: "bg-[rgba(180,180,180,0.06)]",
  },
  3: {
    border: "border-[rgba(180,100,30,0.5)]",
    text: "text-[#b4641e]",
    bg: "bg-[rgba(180,100,30,0.08)]",
  },
};
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
  const [rounds, setRounds] = useState([]);
  const [activeRound, setActiveRound] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [judges, setJudges] = useState([]);
  const [scores, setScores] = useState({});
  const [favorites, setFavorites] = useState({}); // { judgeId_rank: participantId }
  const [roundInfo, setRoundInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [commentModal, setCommentModal] = useState(null);
  useEffect(() => {
    loadRounds();
  }, []);
  useEffect(() => {
    if (activeRound) loadRoundData(activeRound);
  }, [activeRound]);
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
    const [
      { data: roundData },
      { data: participantData },
      { data: rjData },
      { data: scoreData },
      { data: favData },
    ] = await Promise.all([
      supabase.from("rounds").select("*").eq("id", roundId).single(),
      supabase
        .from("participants")
        .select("*")
        .eq("round_id", roundId)
        .order("order_num"),
      supabase.from("round_judges").select("judge_id").eq("round_id", roundId),
      supabase.from("scores").select("*").eq("round_id", roundId),
      supabase.from("favorites").select("*").eq("round_id", roundId),
    ]);
    setRoundInfo(roundData);
    setParticipants(participantData || []);
    // Nur Richter dieser Runde
    const allowedJudgeIds = (rjData || []).map((r) => r.judge_id);
    let roundJudgesList = [];
    if (allowedJudgeIds.length) {
      const { data: jData } = await supabase
        .from("judges")
        .select("*")
        .in("id", allowedJudgeIds)
        .order("order_num");
      roundJudgesList = jData || [];
    }
    setJudges(roundJudgesList);
    const scoreMap = {};
    (scoreData || []).forEach((s) => {
      scoreMap[`${s.participant_id}_${s.judge_id}`] = {
        score: s.score,
        comment: s.comment || "",
      };
    });
    setScores(scoreMap);
    const favMap = {};
    (favData || []).forEach((f) => {
      favMap[`${f.judge_id}_${f.rank}`] = f.participant_id;
    });
    setFavorites(favMap);
    setLoading(false);
  }
  function totalScore(participantId) {
    return judges.reduce((sum, j) => {
      const val = scores[`${participantId}_${j.id}`]?.score;
      return (
        sum +
        (val !== null && val !== undefined && val !== "" ? Number(val) : 0)
      );
    }, 0);
  }
  const isKnockout = roundInfo?.type === "knockout";
  // Immer nach Punkten sortiert (ausser Knockout — dort Original-Reihenfolge).
  const ranked = [...participants].sort(
    (a, b) => totalScore(b.id) - totalScore(a.id),
  );
  const displayParticipants = isKnockout ? participants : ranked;
  return (
    <>
      <div className="top-marquee" aria-hidden="true">
        <div className="top-marquee-track">
          0.49 GERMANY • СЫРОЙ БАТЛ • ПЕРВЫЙ ОТБОРОЧНЫЙ РАУНД • 0.49 GERMANY •
          СЫРОЙ БАТЛ • ПЕРВЫЙ ОТБОРОЧНЫЙ РАУНД •
        </div>
      </div>
      <main className="relative z-10 max-w-[1100px] mx-auto px-4 pt-20 pb-20">
        {/* ── Zurück ── */}
        <button
          onClick={() => (window.location.href = "/raw-battle/")}
          className={`mb-7 inline-flex items-center gap-2 ${BG} border border-white/[0.1] rounded-full px-4 py-1.5 font-[Montserrat] text-[11px] font-bold tracking-[0.12em] uppercase text-[rgba(245,232,207,0.45)] cursor-pointer transition-colors duration-150 hover:text-[#f5e8cf] hover:bg-white/[0.1]`}
        >
          ← назад
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
              <img
                src={roundInfo.visual_url}
                alt="Раунд"
                className="max-w-[200px] rounded-lg border border-white/10"
              />
            )}
            {roundInfo.extra_info && (
              <p className="font-[Montserrat] text-[13px] text-[rgba(245,232,207,0.6)] leading-[1.65] m-0">
                {roundInfo.extra_info}
              </p>
            )}
          </div>
        )}
        {/* ── Runden-Tabs ── */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {rounds.map((r) => (
            <button
              key={r.id}
              onClick={() => setActiveRound(r.id)}
              className={`px-4 py-1.5 rounded-full border font-[Montserrat] text-[11px] font-bold tracking-[0.1em] uppercase cursor-pointer transition-all duration-150
                ${
                  activeRound === r.id
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
                  {
                    item: ranked[0],
                    place: "1",
                    borderColor: "border-[rgba(255,200,0,0.3)]",
                    placeColor: "text-[#ffc800]",
                  },
                  {
                    item: ranked[1],
                    place: "2",
                    borderColor: "border-[rgba(180,180,180,0.3)]",
                    placeColor: "text-[#b4b4b4]",
                  },
                  {
                    item: ranked[2],
                    place: "3",
                    borderColor: "border-[rgba(180,100,30,0.3)]",
                    placeColor: "text-[#b4641e]",
                  },
                ].map(({ item, place, borderColor, placeColor }) => (
                  <div
                    key={place}
                    className={`flex items-center gap-2.5 px-4 py-2.5 rounded-lg border ${BG} font-[Montserrat] ${borderColor}`}
                  >
                    <span className={`text-lg font-bold ${placeColor}`}>
                      {place}
                    </span>
                    <span className="text-[13px] font-bold text-[#f5e8cf] tracking-[0.06em]">
                      {item?.name}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {/* ── Tabelle ── */}
            <div className="overflow-x-auto [-webkit-overflow-scrolling:touch]">
              <table
                className="w-full border-collapse table-fixed font-[Montserrat]"
                style={{ minWidth: `${264 + judges.length * 80}px` }}
              >
                <thead>
                  <tr className="border-b border-white/10 align-bottom">
                    <th className="w-10 px-3 py-2.5 text-[10px] tracking-[0.12em] uppercase text-[rgba(245,232,207,0.35)] font-bold text-left whitespace-nowrap">
                      #
                    </th>
                    <th className="w-[160px] px-3 py-2.5 text-[10px] tracking-[0.12em] uppercase text-[rgba(245,232,207,0.35)] font-bold text-left whitespace-nowrap">
                      Участник
                    </th>
                    {!isKnockout && (
                      <th className="w-[64px] px-3 py-2.5 text-[10px] tracking-[0.12em] uppercase text-[rgba(245,232,207,0.35)] font-bold text-center whitespace-nowrap border-l border-white/[0.06]">
                        Сумма
                      </th>
                    )}
                    {judges.map((j) => (
                      <th
                        key={j.id}
                        className="min-w-[80px] px-2 py-2.5 text-[10px] tracking-[0.12em] uppercase text-[rgba(245,232,207,0.35)] font-bold text-center border-l border-white/[0.06]"
                      >
                        <div className="flex flex-col items-center gap-1.5">
                          {j.avatar_url ? (
                            <img
                              src={j.avatar_url}
                              alt={j.name}
                              className="w-[47px] h-[47px] rounded-sm object-cover"
                            />
                          ) : (
                            <div className="w-[47px] h-[47px] rounded-sm bg-[rgba(217,75,106,0.15)] flex items-center justify-center text-[13px] font-bold text-[#d94b6a]">
                              {j.name[0]}
                            </div>
                          )}
                          <span className="break-words leading-[1.25] max-w-full">
                            {j.name}
                          </span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayParticipants.map((p, idx) => (
                    <tr
                      key={p.id}
                      className={`border-b border-white/[0.05] last:border-b-0 ${BG}`}
                    >
                      <td className="w-10 px-3 py-2.5 text-[12px] text-[rgba(245,232,207,0.3)] font-bold align-middle">
                        {idx + 1}
                      </td>
                      <td className="px-3 py-2.5 text-[13px] font-bold text-[#f5e8cf] tracking-[0.04em] whitespace-nowrap align-middle">
                        {p.name}
                      </td>
                      {!isKnockout && (
                        <td className="px-3 py-2.5 text-[14px] font-bold text-[#f5e8cf] text-center align-middle border-l border-white/[0.06]">
                          {totalScore(p.id)}
                        </td>
                      )}
                      {judges.map((j) => {
                        const key = `${p.id}_${j.id}`;
                        const entry = scores[key];
                        const val = entry?.score;
                        const hasComment = entry?.comment;
                        return (
                          <td
                            key={j.id}
                            className={`px-3 py-2.5 relative text-center align-middle transition-colors duration-200 border-l border-white/[0.06] ${scoreColor(val, isKnockout)}`}
                          >
                            {isKnockout ? (
                              <span className="text-[15px] font-bold text-[#f5e8cf]">
                                {val === 1 ? "✓" : val === 0 ? "✕" : "—"}
                              </span>
                            ) : (
                              <span className="text-[14px] font-bold text-[#f5e8cf]">
                                {val ?? "—"}
                              </span>
                            )}
                            {hasComment && (
                              <button
                                onClick={() =>
                                  setCommentModal({
                                    participant: p.name,
                                    judge: j.name,
                                    comment: entry.comment,
                                  })
                                }
                                title="Показать комментарий"
                                className="absolute top-1 right-1 w-[18px] h-[18px] rounded-full border-0 text-[10px] cursor-pointer flex items-center justify-center p-0 transition-all text-[#f6d77a] bg-[rgba(246,215,122,0.12)] hover:bg-[rgba(246,215,122,0.25)]"
                              >
                                💬
                              </button>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* ── Фавориты судей (kompakt) ── */}
            {!isKnockout &&
              judges.some((j) =>
                [1, 2, 3].some((r) => favorites[`${j.id}_${r}`]),
              ) && (
                <div className="mt-8">
                  <div className="font-[Montserrat] text-[11px] tracking-[0.18em] uppercase text-[rgba(245,232,207,0.35)] mb-3">
                    Личные фавориты судей
                  </div>
                  <div className="flex flex-col gap-2">
                    {judges.map((j) => {
                      const hasFavs = [1, 2, 3].some(
                        (r) => favorites[`${j.id}_${r}`],
                      );
                      if (!hasFavs) return null;
                      return (
                        <div
                          key={j.id}
                          className={`flex items-center gap-3 flex-wrap px-3.5 py-2.5 ${BG} border border-white/[0.12] rounded-lg`}
                        >
                          <div className="font-[Montserrat] text-[11px] font-bold text-[#f5e8cf] tracking-[0.06em] min-w-[90px]">
                            {j.name}
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            {[1, 2, 3].map((rank) => {
                              const pid = favorites[`${j.id}_${rank}`];
                              if (!pid) return null;
                              const p = participants.find((x) => x.id === pid);
                              const c = RANK_COLORS[rank];
                              return (
                                <div
                                  key={rank}
                                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${c.border} ${c.bg}`}
                                >
                                  <span
                                    className={`font-[Montserrat] text-[11px] font-bold ${c.text}`}
                                  >
                                    {rank}
                                  </span>
                                  <span className="font-[Montserrat] text-[11px] font-bold text-[#f5e8cf]">
                                    {p?.name ?? "—"}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
          </>
        )}
      </main>
      {/* ── Kommentar-Modal (nur lesen) ── */}
      {commentModal && (
        <>
          <div
            onClick={() => setCommentModal(null)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200]"
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[201] bg-[rgba(10,10,12,0.98)] border border-white/[0.12] rounded-xl p-7 w-[min(92vw,440px)]">
            <div className="font-[Montserrat] text-[11px] font-bold tracking-[0.1em] uppercase text-[rgba(245,232,207,0.4)] mb-1">
              {commentModal.judge} → {commentModal.participant}
            </div>
            <div className="font-[Montserrat] text-[13px] text-[#f5e8cf] leading-[1.6] mb-6 mt-3">
              {commentModal.comment}
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setCommentModal(null)}
                className={`px-4 py-2 rounded-full border border-white/[0.12] ${BG} text-[rgba(245,232,207,0.5)] font-[Montserrat] text-[11px] font-bold tracking-[0.1em] uppercase cursor-pointer transition-all hover:text-[#f5e8cf] hover:bg-white/[0.1]`}
              >
                Закрыть
              </button>
            </div>
          </div>
        </>
      )}
      <footer className="site-footer">
        <div className="site-footer-links">
          <button
            className="footer-modal-link"
            type="button"
            onClick={() => (window.location.href = "/raw-battle/")}
          >
            ← Самплер
          </button>
        </div>
      </footer>
    </>
  );
}