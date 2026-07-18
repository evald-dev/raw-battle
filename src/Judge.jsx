import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "./supabase";
import { useAuth } from "./AuthContext";
import "./styles.css";

const BG = "bg-[oklch(26.9%_0_0/0.8)]";

function scoreColor(score) {
  if (score === null || score === undefined || score === "") return "";
  const n = Number(score);
  if (n <= 3) return "bg-[#d94b6a]/25";
  if (n <= 6) return "bg-yellow-500/25";
  if (n <= 8) return "bg-lime-500/25";
  return "bg-emerald-500/25";
}

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

export default function Judge() {
  const { judgeId, signOut } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [rounds, setRounds] = useState([]);
  const [activeRound, setActiveRound] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [myJudge, setMyJudge] = useState(null);
  const [scores, setScores] = useState({});
  const [favorites, setFavorites] = useState({});
  const [completed, setCompleted] = useState(false); // habe ICH abgeschlossen?
  const [otherScores, setOtherScores] = useState({});
  const [otherFavs, setOtherFavs] = useState({});
  const [judges, setJudges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commentModal, setCommentModal] = useState(null);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (judgeId) loadRounds();
  }, [judgeId]);
  useEffect(() => {
    if (activeRound && judgeId) loadRoundData(activeRound);
  }, [activeRound, judgeId]);

  async function loadRounds() {
    // Nur Runden laden, denen dieser Richter zugeordnet ist
    const { data: rjData } = await supabase
      .from("round_judges")
      .select("round_id")
      .eq("judge_id", judgeId);
    const allowedIds = (rjData || []).map((r) => r.round_id);

    if (allowedIds.length === 0) {
      setRounds([]);
      setActiveRound(null);
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("rounds")
      .select("*")
      .in("id", allowedIds)
      .order("order_num");
    setRounds(data || []);
    if (data?.length) setActiveRound(data[0].id);
  }

  async function loadRoundData(roundId) {
    setLoading(true);
    const [
      { data: participantData },
      { data: judgeData },
      { data: rjData },
      { data: myScoreData },
      { data: myFavData },
      { data: myCompletion },
    ] = await Promise.all([
      supabase
        .from("participants")
        .select("*")
        .eq("round_id", roundId)
        .order("order_num"),
      supabase.from("judges").select("*").eq("id", judgeId).single(),
      supabase.from("round_judges").select("judge_id").eq("round_id", roundId),
      supabase
        .from("scores")
        .select("*")
        .eq("round_id", roundId)
        .eq("judge_id", judgeId),
      supabase
        .from("favorites")
        .select("*")
        .eq("round_id", roundId)
        .eq("judge_id", judgeId),
      supabase
        .from("judge_completion")
        .select("*")
        .eq("round_id", roundId)
        .eq("judge_id", judgeId)
        .maybeSingle(),
    ]);

    const parts = participantData || [];
    setParticipants(parts);
    setMyJudge(judgeData);

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
    (myScoreData || []).forEach((s) => {
      scoreMap[s.participant_id] = { score: s.score, comment: s.comment || "" };
    });
    setScores(scoreMap);

    const favMap = {};
    (myFavData || []).forEach((f) => {
      favMap[f.rank] = f.participant_id;
    });
    setFavorites(favMap);

    const isCompleted = myCompletion?.completed === true;
    setCompleted(isCompleted);

    // Andere Daten nur laden wenn ICH abgeschlossen habe
    if (isCompleted) {
      await loadOthers(roundId);
    } else {
      setOtherScores({});
      setOtherFavs({});
    }

    setLoading(false);
  }

  async function loadOthers(roundId) {
    const [{ data: allScoreData }, { data: allFavData }] = await Promise.all([
      supabase.from("scores").select("*").eq("round_id", roundId),
      supabase.from("favorites").select("*").eq("round_id", roundId),
    ]);
    const otherScoreMap = {};
    (allScoreData || []).forEach((s) => {
      otherScoreMap[`${s.participant_id}_${s.judge_id}`] = {
        score: s.score,
        comment: s.comment || "",
      };
    });
    setOtherScores(otherScoreMap);
    const otherFavMap = {};
    (allFavData || []).forEach((f) => {
      otherFavMap[`${f.judge_id}_${f.rank}`] = f.participant_id;
    });
    setOtherFavs(otherFavMap);
  }

  function totalScore(participantId) {
    if (!completed) return null;
    return judges.reduce((sum, j) => {
      const val = otherScores[`${participantId}_${j.id}`]?.score;
      return (
        sum +
        (val !== null && val !== undefined && val !== "" ? Number(val) : 0)
      );
    }, 0);
  }

  async function saveScore(participantId, value) {
    if (completed) return; // gesperrt
    const existing = scores[participantId];
    setScores((prev) => ({
      ...prev,
      [participantId]: { ...existing, score: value },
    }));
    await supabase.from("scores").upsert(
      {
        round_id: activeRound,
        participant_id: participantId,
        judge_id: judgeId,
        score: value,
        comment: existing?.comment || "",
      },
      { onConflict: "round_id,participant_id,judge_id" },
    );
  }

  async function saveComment(participantId, comment) {
    if (completed) return;
    const existing = scores[participantId];
    setScores((prev) => ({
      ...prev,
      [participantId]: { ...prev[participantId], comment },
    }));
    await supabase.from("scores").upsert(
      {
        round_id: activeRound,
        participant_id: participantId,
        judge_id: judgeId,
        score: existing?.score ?? null,
        comment,
      },
      { onConflict: "round_id,participant_id,judge_id" },
    );
    setCommentModal(null);
  }

  async function saveFavorite(rank, participantId) {
    if (completed) return;
    const current = favorites[rank];
    if (current === participantId) {
      setFavorites((prev) => {
        const n = { ...prev };
        delete n[rank];
        return n;
      });
      await supabase
        .from("favorites")
        .delete()
        .eq("round_id", activeRound)
        .eq("judge_id", judgeId)
        .eq("rank", rank);
      return;
    }
    setFavorites((prev) => ({ ...prev, [rank]: participantId }));
    await supabase.from("favorites").upsert(
      {
        round_id: activeRound,
        judge_id: judgeId,
        participant_id: participantId,
        rank,
      },
      { onConflict: "round_id,judge_id,rank" },
    );
  }

  async function finishJudging() {
    // Sicherheitsprüfung: nur abschließen wenn Noten UND Favoriten vollständig
    const scoredNow = participants.filter((p) => {
      const v = scores[p.id]?.score;
      return v !== null && v !== undefined && v !== "";
    }).length;
    const reqFavs = Math.min(3, participants.length);
    const favsNow = [1, 2, 3].filter((r) => favorites[r]).length;
    const ok =
      participants.length > 0 &&
      scoredNow >= participants.length &&
      favsNow >= reqFavs;

    if (!ok) {
      setConfirmFinish(false);
      alert("Сначала оцените всех участников и выберите всех фаворитов.");
      return;
    }
    setFinishing(true);
    await supabase.from("judge_completion").upsert(
      {
        round_id: activeRound,
        judge_id: judgeId,
        completed: true,
      },
      { onConflict: "round_id,judge_id" },
    );
    setCompleted(true);
    setConfirmFinish(false);
    await loadOthers(activeRound);
    setFinishing(false);
  }

  async function uploadAvatar(e) {
    const file = e.target.files?.[0];
    if (!file || !judgeId) return;

    // Nur Bilder, max 5 MB
    if (!file.type.startsWith("image/")) {
      alert("Пожалуйста, выберите изображение.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("Файл слишком большой (макс. 5 МБ).");
      return;
    }

    setUploading(true);

    // Dateiname: judgeId + Zeitstempel (überschreibt nicht, eindeutig)
    const ext = file.name.split(".").pop();
    const path = `avatars/${judgeId}-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("images")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      alert("Ошибка загрузки: " + uploadError.message);
      setUploading(false);
      return;
    }

    // Öffentliche URL holen
    const { data: urlData } = supabase.storage
      .from("images")
      .getPublicUrl(path);
    const publicUrl = urlData.publicUrl;

    // In judges-Tabelle speichern
    const { data: updated, error: updateError } = await supabase
      .from("judges")
      .update({ avatar_url: publicUrl })
      .eq("id", judgeId)
      .select();

    if (updateError) {
      alert("Ошибка сохранения: " + updateError.message);
      setUploading(false);
      return;
    }

    if (!updated || updated.length === 0) {
      alert(
        "Не удалось сохранить фото (нет прав на обновление). Проверьте RLS-политику judges_update_own.",
      );
      setUploading(false);
      return;
    }

    setMyJudge((prev) => ({ ...prev, avatar_url: publicUrl }));
    setUploading(false);
  }

  const scoredCount = participants.filter((p) => {
    const val = scores[p.id]?.score;
    return val !== null && val !== undefined && val !== "";
  }).length;

  const allScored =
    scoredCount >= participants.length && participants.length > 0;

  // Wie viele Favoriten-Plätze müssen gesetzt sein (max 3, aber nie mehr als Teilnehmer)
  const requiredFavs = Math.min(3, participants.length);
  const favCount = [1, 2, 3].filter((r) => favorites[r]).length;
  const allFavsSet = favCount >= requiredFavs && requiredFavs > 0;

  // Abschluss nur wenn Noten UND Favoriten vollständig
  const canFinish = allScored && allFavsSet;

  return (
    <>

      <div className="top-marquee" aria-hidden="true">
        <div className="top-marquee-track">
          0.49 GERMANY • СЫРОЙ БАТЛ • ПЕРВЫЙ ОТБОРОЧНЫЙ РАУНД • 0.49 GERMANY •
          СЫРОЙ БАТЛ • ПЕРВЫЙ ОТБОРОЧНЫЙ РАУНД •
        </div>
      </div>

      <main className="relative z-10 max-w-[860px] mx-auto px-4 pt-20 pb-20">
        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
          <div className="flex items-center gap-4">
            {/* Avatar mit Upload */}
            <div className="relative flex-shrink-0">
              {myJudge?.avatar_url ? (
                <img
                  src={myJudge.avatar_url}
                  alt={myJudge.name}
                  className="w-16 h-16 rounded-full object-cover border-2 border-[#d94b6a]"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-[rgba(217,75,106,0.15)] border-2 border-[rgba(217,75,106,0.3)] flex items-center justify-center text-2xl font-bold text-[#d94b6a] font-[Montserrat]">
                  {myJudge?.name?.[0] ?? "?"}
                </div>
              )}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                title="Изменить фото"
                className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#d94b6a] border-2 border-[#0f1014] flex items-center justify-center text-white text-[12px] cursor-pointer transition-all hover:bg-[#c43d5a] disabled:opacity-50"
              >
                {uploading ? "…" : "✎"}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={uploadAvatar}
                className="hidden"
              />
            </div>

            <div>
              <div className="font-[Montserrat] text-[11px] tracking-[0.18em] uppercase text-[rgba(245,232,207,0.35)] mb-1">
                0.49 — СЫРОЙ БАТЛ
              </div>
              <div className="font-[Montserrat] text-[22px] font-bold tracking-[0.04em] text-[#f5e8cf]">
                Панель судьи
              </div>
              {myJudge && (
                <div className="font-[Montserrat] text-[13px] text-[rgba(245,232,207,0.5)] mt-1">
                  {myJudge.name}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={signOut}
            className={`px-4 py-1.5 rounded-full border border-white/[0.12] ${BG} text-[rgba(245,232,207,0.45)] font-[Montserrat] text-[11px] font-bold tracking-[0.1em] uppercase cursor-pointer transition-all hover:text-[#f5e8cf]`}
          >
            Выйти
          </button>
        </div>

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
                    : `border-white/[0.12] ${BG} text-[rgba(245,232,207,0.45)] hover:text-[#f5e8cf]`
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
        ) : rounds.length === 0 ? (
          <div className="text-center py-16 font-[Montserrat] text-[13px] tracking-[0.1em] uppercase text-[rgba(245,232,207,0.25)]">
            Вы пока не назначены ни на один раунд
          </div>
        ) : participants.length === 0 ? (
          <div className="text-center py-16 font-[Montserrat] text-[13px] tracking-[0.1em] uppercase text-[rgba(245,232,207,0.25)]">
            Участников пока нет
          </div>
        ) : (
          <>
            {/* ── Fortschritt ── */}
            <div
              className={`${BG} border border-white/[0.12] rounded-xl p-4 mb-6 flex items-center gap-4`}
            >
              <div className="flex-1">
                <div className="font-[Montserrat] text-[11px] tracking-[0.1em] uppercase text-[rgba(245,232,207,0.4)] mb-2">
                  Прогресс оценивания
                </div>
                <div className="h-2 bg-white/[0.08] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#d94b6a] rounded-full transition-all duration-500"
                    style={{
                      width: `${participants.length ? (scoredCount / participants.length) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
              <div className="font-[Montserrat] text-[18px] font-bold text-[#f5e8cf]">
                {scoredCount}/{participants.length}
              </div>
            </div>

            {/* ── Status nach Abschluss ── */}
            {completed && (
              <div className="mb-6 px-4 py-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 font-[Montserrat] text-[12px] text-emerald-400 tracking-[0.08em]">
                ✓ Судейство завершено — ваши оценки заблокированы, результаты
                других судей теперь видны
              </div>
            )}

            {/* ── Bewertungstabelle ── */}
            <div className="overflow-x-auto mb-8">
              <table className="w-full border-collapse font-[Montserrat] min-w-[400px]">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="px-3 py-2.5 text-[10px] tracking-[0.12em] uppercase text-[rgba(245,232,207,0.35)] font-bold text-left">
                      #
                    </th>
                    <th className="px-3 py-2.5 text-[10px] tracking-[0.12em] uppercase text-[rgba(245,232,207,0.35)] font-bold text-left">
                      Участник
                    </th>
                    {completed && (
                      <th className="px-3 py-2.5 text-[10px] tracking-[0.12em] uppercase text-[rgba(245,232,207,0.35)] font-bold text-center">
                        Сумма
                      </th>
                    )}
                    <th className="px-3 py-2.5 text-[10px] tracking-[0.12em] uppercase text-[rgba(245,232,207,0.35)] font-bold text-center">
                      Моя оценка
                    </th>
                    {completed &&
                      judges
                        .filter((j) => j.id !== judgeId)
                        .map((j) => (
                          <th
                            key={j.id}
                            className="px-3 py-2.5 text-[10px] tracking-[0.12em] uppercase text-[rgba(245,232,207,0.35)] font-bold text-center whitespace-nowrap"
                          >
                            {j.name}
                          </th>
                        ))}
                  </tr>
                </thead>
                <tbody>
                  {participants.map((p, idx) => {
                    const entry = scores[p.id];
                    const val = entry?.score;
                    const hasComment = entry?.comment;
                    return (
                      <tr
                        key={p.id}
                        className={`border-b border-white/[0.05] last:border-b-0 ${BG}`}
                      >
                        <td className="px-3 py-2.5 text-[12px] text-[rgba(245,232,207,0.3)] font-bold w-8 align-middle">
                          {idx + 1}
                        </td>
                        <td className="px-3 py-2.5 text-[13px] font-bold text-[#f5e8cf] tracking-[0.04em] uppercase whitespace-nowrap align-middle">
                          {p.name}
                        </td>
                        {completed && (
                          <td className="px-3 py-2.5 text-[14px] font-bold text-[#f5e8cf] text-center align-middle">
                            {totalScore(p.id)}
                          </td>
                        )}
                        <td
                          className={`px-3 py-2.5 relative text-center align-middle transition-colors duration-200 ${scoreColor(val)}`}
                        >
                          <input
                            type="number"
                            min="0"
                            max="10"
                            value={val ?? ""}
                            disabled={completed}
                            onChange={(e) => {
                              const v =
                                e.target.value === ""
                                  ? null
                                  : Math.min(
                                      10,
                                      Math.max(0, Number(e.target.value)),
                                    );
                              saveScore(p.id, v);
                            }}
                            className={`w-11 ${BG} border border-white/[0.15] rounded text-[#f5e8cf] font-[Montserrat] text-[13px] font-bold text-center p-1 outline-none transition-colors focus:border-[#d94b6a] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none disabled:opacity-60 disabled:cursor-not-allowed`}
                          />
                          {!completed && (
                            <button
                              onClick={() =>
                                setCommentModal({
                                  participantId: p.id,
                                  value: entry?.comment || "",
                                })
                              }
                              className={`absolute top-1 right-1 w-[18px] h-[18px] rounded-full border-0 text-[10px] cursor-pointer flex items-center justify-center p-0 transition-all
                                ${hasComment ? "text-[#f6d77a] bg-[rgba(246,215,122,0.12)]" : `text-[rgba(245,232,207,0.4)] ${BG} hover:bg-white/[0.15]`}`}
                            >
                              {hasComment ? "💬" : "+"}
                            </button>
                          )}
                          {completed && hasComment && (
                            <span className="absolute top-1 right-1 text-[10px]">
                              💬
                            </span>
                          )}
                        </td>
                        {completed &&
                          judges
                            .filter((j) => j.id !== judgeId)
                            .map((j) => {
                              const otherVal =
                                otherScores[`${p.id}_${j.id}`]?.score;
                              return (
                                <td
                                  key={j.id}
                                  className={`px-3 py-2.5 text-center align-middle text-[13px] font-bold text-[#f5e8cf] ${scoreColor(otherVal)}`}
                                >
                                  {otherVal ?? "—"}
                                </td>
                              );
                            })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ── Favoriten ── */}
            <div className={`${BG} border border-white/[0.12] rounded-xl p-5`}>
              <div className="font-[Montserrat] text-[11px] tracking-[0.18em] uppercase text-[rgba(245,232,207,0.35)] mb-4 flex items-center justify-between gap-2">
                <span>Мои фавориты (обязательно)</span>
                {!completed && (
                  <span
                    className={
                      favCount >= requiredFavs
                        ? "text-emerald-400"
                        : "text-[#d94b6a]"
                    }
                  >
                    {favCount}/{requiredFavs}
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-3">
                {[1, 2, 3].map((rank) => {
                  const selectedId = favorites[rank];
                  const c = RANK_COLORS[rank];
                  return (
                    <div
                      key={rank}
                      className="flex items-center gap-3 flex-wrap"
                    >
                      <div
                        className={`w-7 h-7 rounded-full border ${c.border} ${c.bg} flex items-center justify-center font-[Montserrat] text-[12px] font-bold ${c.text} flex-shrink-0`}
                      >
                        {rank}
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {participants.map((p) => {
                          const isSelected = selectedId === p.id;
                          const otherRank = [1, 2, 3]
                            .filter((r) => r !== rank)
                            .find((r) => favorites[r] === p.id);
                          const disabled = completed || !!otherRank;
                          return (
                            <button
                              key={p.id}
                              onClick={() => saveFavorite(rank, p.id)}
                              disabled={disabled}
                              className={`px-3 py-1 rounded-full border font-[Montserrat] text-[11px] font-bold tracking-[0.06em] uppercase transition-all duration-150
                                ${
                                  isSelected
                                    ? `${c.border} ${c.bg} ${c.text}`
                                    : disabled
                                      ? "border-white/[0.06] text-[rgba(245,232,207,0.2)] cursor-not-allowed opacity-40 bg-transparent"
                                      : `border-white/[0.12] ${BG} text-[rgba(245,232,207,0.55)] hover:text-[#f5e8cf] hover:border-white/25 cursor-pointer`
                                }`}
                            >
                              {p.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Завершить судейство ── */}
            {!completed && (
              <div className="mt-8">
                {!canFinish && (
                  <div className="mb-3 px-4 py-3 rounded-xl border border-white/[0.1] bg-white/[0.03] font-[Montserrat] text-[12px] text-[rgba(245,232,207,0.5)] tracking-[0.06em] text-center leading-[1.7]">
                    {!allScored && (
                      <div>
                        Оцените всех участников ({scoredCount}/
                        {participants.length})
                      </div>
                    )}
                    {!allFavsSet && (
                      <div>
                        Выберите всех фаворитов ({favCount}/{requiredFavs})
                      </div>
                    )}
                  </div>
                )}
                <button
                  onClick={() => setConfirmFinish(true)}
                  disabled={!canFinish}
                  className={`w-full px-4 py-3 rounded-full border font-[Montserrat] text-[12px] font-bold tracking-[0.1em] uppercase transition-all
                    ${
                      canFinish
                        ? "border-emerald-500 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 cursor-pointer"
                        : "border-white/[0.1] bg-white/[0.03] text-[rgba(245,232,207,0.25)] cursor-not-allowed"
                    }`}
                >
                  Завершить судейство
                </button>
              </div>
            )}

            {/* ── Andere Favoriten (nach Abschluss) ── */}
            {completed && (
              <div className="mt-6">
                <div className="font-[Montserrat] text-[11px] tracking-[0.18em] uppercase text-[rgba(245,232,207,0.35)] mb-4">
                  Фавориты всех судей
                </div>
                <div className="flex flex-col gap-4">
                  {judges.map((j) => (
                    <div
                      key={j.id}
                      className={`${BG} border border-white/[0.12] rounded-xl p-4`}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        {j.avatar_url ? (
                          <img
                            src={j.avatar_url}
                            alt={j.name}
                            className="w-7 h-7 rounded-full object-cover border border-[#d94b6a]"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-[rgba(217,75,106,0.15)] border border-[rgba(217,75,106,0.3)] flex items-center justify-center text-[11px] font-bold text-[#d94b6a]">
                            {j.name[0]}
                          </div>
                        )}
                        <div className="font-[Montserrat] text-[12px] font-bold text-[#f5e8cf] tracking-[0.06em] uppercase">
                          {j.name}
                        </div>
                      </div>
                      <div className="flex gap-3 flex-wrap">
                        {[1, 2, 3].map((rank) => {
                          const pid = otherFavs[`${j.id}_${rank}`];
                          const p = participants.find((x) => x.id === pid);
                          const c = RANK_COLORS[rank];
                          return (
                            <div
                              key={rank}
                              className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${c.border} ${c.bg}`}
                            >
                              <span
                                className={`font-[Montserrat] text-[11px] font-bold ${c.text}`}
                              >
                                {rank}
                              </span>
                              <span className="font-[Montserrat] text-[11px] font-bold text-[#f5e8cf] uppercase">
                                {p?.name ?? "—"}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* ── Bestätigungs-Modal "Завершить судейство" ── */}
      {confirmFinish && (
        <>
          <div
            onClick={() => setConfirmFinish(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200]"
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[201] bg-[rgba(10,10,12,0.98)] border border-white/[0.12] rounded-xl p-7 w-[min(92vw,440px)]">
            <div className="font-[Montserrat] text-[14px] font-bold tracking-[0.08em] uppercase text-[#f5e8cf] mb-3">
              Завершить судейство?
            </div>
            <p className="font-[Montserrat] text-[13px] text-[rgba(245,232,207,0.6)] leading-[1.6] mb-6">
              После завершения ваши оценки будут заблокированы и станут видны
              другим. Изменить их больше нельзя.
            </p>
            <div className="flex gap-2.5 justify-end">
              <button
                onClick={() => setConfirmFinish(false)}
                disabled={finishing}
                className={`px-4 py-2 rounded-full border border-white/[0.12] ${BG} text-[rgba(245,232,207,0.5)] font-[Montserrat] text-[11px] font-bold tracking-[0.1em] uppercase cursor-pointer transition-all hover:text-[#f5e8cf]`}
              >
                Отмена
              </button>
              <button
                onClick={finishJudging}
                disabled={finishing}
                className="px-4 py-2 rounded-full border border-emerald-500 bg-emerald-500/15 text-emerald-300 font-[Montserrat] text-[11px] font-bold tracking-[0.1em] uppercase cursor-pointer transition-all hover:bg-emerald-500/25 disabled:opacity-50"
              >
                {finishing ? "..." : "Завершить"}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Kommentar-Modal ── */}
      {commentModal && (
        <>
          <div
            onClick={() => setCommentModal(null)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200]"
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[201] bg-[rgba(10,10,12,0.98)] border border-white/[0.12] rounded-xl p-7 w-[min(92vw,440px)]">
            <div className="font-[Montserrat] text-[13px] font-bold tracking-[0.1em] uppercase text-[#f5e8cf] mb-4">
              Комментарий
            </div>
            <textarea
              value={commentModal.value}
              onChange={(e) =>
                setCommentModal((prev) => ({ ...prev, value: e.target.value }))
              }
              placeholder="Введите комментарий..."
              rows={5}
              className={`w-full ${BG} border border-white/[0.15] rounded-lg text-[#f5e8cf] font-[Montserrat] text-[13px] leading-[1.6] p-3 outline-none resize-y mb-4 focus:border-[#d94b6a] transition-colors`}
            />
            <div className="flex gap-2.5 justify-end">
              <button
                onClick={() => setCommentModal(null)}
                className={`px-4 py-2 rounded-full border border-white/[0.12] ${BG} text-[rgba(245,232,207,0.5)] font-[Montserrat] text-[11px] font-bold tracking-[0.1em] uppercase cursor-pointer transition-all hover:text-[#f5e8cf]`}
              >
                Отмена
              </button>
              <button
                onClick={() =>
                  saveComment(commentModal.participantId, commentModal.value)
                }
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
          <button
            className="footer-modal-link"
            type="button"
            onClick={() => navigate("/")}
          >
            ← Самплер
          </button>
        </div>
      </footer>
    </>
  );
}
