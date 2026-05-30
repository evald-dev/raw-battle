import { useState, useEffect, useRef } from "react";
import "./styles.css";
import { useNavigate } from 'react-router-dom'

const DAY_VIDEO_SRC = "videos/day-screen.mp4";
const NIGHT_VIDEO_SRC = "videos/night-screen.mp4";

function getTimeBasedVideoSrc() {
  const hour = new Date().getHours();
  return hour >= 10 ? DAY_VIDEO_SRC : NIGHT_VIDEO_SRC;
}



// ── main component ────────────────────────────────────────────────────────

export default function App() {


  const bgVideoRef = useRef(null);
  const screenVideoRef = useRef(null);
  const filmScrollRef = useRef(null);

const navigate = useNavigate()

  const [panelOpen, setPanelOpen] = useState(false);
  const [filmContent, setFilmContent] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState(null);
  const [clock, setClock] = useState("00:00");
  const [pressedBtn, setPressedBtn] = useState(null);

  // makeSeamlessLoop
  useEffect(() => {
    const loop = (video) => {
      if (!video) return;
      const handler = () => {
        video.currentTime = 0.01;
        video.play().catch(() => { });
      };
      video.addEventListener("ended", handler);
      return () => video.removeEventListener("ended", handler);
    };
    const cleanBg = loop(bgVideoRef.current);
    const cleanScreen = loop(screenVideoRef.current);
    return () => { cleanBg?.(); cleanScreen?.(); };
  }, []);

  // setTimeBasedScreenVideo — on mount + every 60s
  useEffect(() => {
    const set = () => {
      const video = screenVideoRef.current;
      if (!video) return;
      const targetSrc = getTimeBasedVideoSrc();
      if (video.getAttribute("src") !== targetSrc) {
        video.src = targetSrc;
        video.load();
        video.play().catch(() => { });
      }
    };
    set();
    const id = setInterval(set, 60 * 1000);
    return () => clearInterval(id);
  }, []);

  // updateLiveClock — on mount + every 1s
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, "0");
      const m = String(now.getMinutes()).padStart(2, "0");
      setClock(`${h}:${m}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // Escape — closeFilm + closeInfoModal
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") {
        closeFilm();
        closeInfoModal();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // document.body panel-open class
  useEffect(() => {
    if (panelOpen) {
      document.body.classList.add("panel-open");
    } else {
      document.body.classList.remove("panel-open");
    }
  }, [panelOpen]);

  function openFilm(content) {
    setFilmContent(content);
    setPanelOpen(true);
    if (filmScrollRef.current) filmScrollRef.current.scrollTop = 0;
  }

  function closeFilm() {
    setPanelOpen(false);
  }

  function openInfoModal(content) {
    setModalContent(content);
    setModalOpen(true);
  }

  function closeInfoModal() {
    setModalOpen(false);
  }

  function pointerHandlers(key) {
    return {
      onPointerDown: () => setPressedBtn(key),
      onPointerUp: () => setPressedBtn(null),
      onPointerLeave: () => setPressedBtn(null),
      onPointerCancel: () => setPressedBtn(null),
    };
  }

  return (
    <>
      {/* ── video background ── */}
      <div className="video-bg" aria-hidden="true">
        <video id="bgVideo" ref={bgVideoRef} autoPlay muted playsInline preload="auto">
          <source src="videos/tv-noise.mp4" type="video/mp4" />
        </video>
      </div>

      {/* ── top marquee ── */}
      <div className="top-marquee" aria-hidden="true">
        <div className="top-marquee-track">
          0.49 GERMANY • СЫРОЙ БАТЛ • ПЕРВЫЙ ОТБОРОЧНЫЙ РАУНД • 0.49 GERMANY • СЫРОЙ БАТЛ • ПЕРВЫЙ ОТБОРОЧНЫЙ РАУНД •
        </div>
      </div>

      {/* ── main layout ── */}
      <main className="layout">
        <section className="sampler-stage" aria-label="кликабельный семплер" id="samplerStage">

          {/* screen overlay */}
          <div
            className="overlay screen"
            style={{
              "--x": "calc(var(--screen-left) / var(--img-w) * 100%)",
              "--y": "calc(var(--screen-top) / var(--img-h) * 100%)",
              "--w": "calc(var(--screen-w) / var(--img-w) * 100%)",
              "--h": "calc(var(--screen-h) / var(--img-h) * 100%)",
            }}
          >
            <video id="screenVideo" ref={screenVideoRef} autoPlay muted playsInline aria-label="Экран видео" />

            <div className="screen-clock" aria-hidden="true">
              <span className="screen-clock-bg">88:88</span>
              <span className="screen-clock-value" id="liveClock">{clock}</span>
            </div>

            <img className="screen-crack" src="images/screen-crack.png" alt="" aria-hidden="true" />
          </div>

          {/* ── taster: правила — x:37.7% y:43.3% ── */}
          <button
            className={`taster-btn${pressedBtn === "pravila" ? " is-pressed" : ""}`}
            style={{ "--x": "37.7%", "--y": "43.3%" }}
            aria-label="Правила"
            {...pointerHandlers("pravila")}
            onClick={() => openFilm(
              <span dangerouslySetInnerHTML={{
                __html:
                  `<u>ПРАВИЛА</u> <br>
1. Принять участие могут любые <span style='color:#da6a1b;'>русскоязычные исполнители</span>, хоть проект и нацелен на участников из Германии<br><br>
2. Для участия необходимо <span style='color:#da6a1b;'>сдать трек</span> на первый отборочный раунд. Трек должен соответствовать <span style='color:#da6a1b;'>следующим критериям:</span><br>
<div style='margin-left:15px;'>
<em>
- Трек соответствует теме раунда<br>
- Трек написан специально для проекта (ваши старые треки без раскрытия темы раунда не принимаются)<br>
- Трек на русском языке (небольшие вставки или фразы на других языках допускаются)<br>
- Все треки записываются только одним исполнителем на протяжении всего проекта<br>
- Трек без использования нейросети<br>
- Максимальная длина трека - 3,5 минуты
</em>
</div><br>
3. Качество записи и <span style='color:#da6a1b;'>сведение не оцениваются</span> (СЫРОЙ БАТЛ)<br><br>
4. Треки <span style='color:#da6a1b;'>остаются в собственности участников.</span> Организатор проекта не использует их в своих целях и не несет за них ответственность<br><br>
<u>АЛГОРИТМ БАТЛА</u><br><br>
- Каждый раунд участники получают тему для трека.<br>
- Участники записывают треки на эту тему и сдают их на судейство.<br>
- Участники набравшие наибольшее количество баллов <span style='color:#da6a1b;'>проходят в следующий раунд.</span><br>
- Первые два раунда - отборочные, затем участники соревнуются в парах вплоть до финала.<br>
- Треки на отборочные раунды оцениваются по 10-бальной системе.<br><br>
Критерии оценки и концепт смотри здесь <a href='#' data-open-film='concept' style='color:#ce1919e0; text-decoration: underline;'>(ссылка)</a>.`
              }} />
            )}
          />
          <span className="taster-label" style={{ "--x": "37.7%", "--y": "50%" }}>правила</span>

          {/* ── taster: призовые — x:13.6% y:57.5% ── */}
           <button
      className={`taster-btn${pressedBtn === "prizy" ? " is-pressed" : ""}`}
      style={{ "--x": "13.6%", "--y": "57.5%" }}
      aria-label="Призовые"
      {...pointerHandlers("prizy")}
      onClick={() => openFilm(
              <span dangerouslySetInnerHTML={{
                __html: `<u>ПРИЗОВЫЕ</u><br><br>
0.49 - <span style='color:#da6a1b;'>не коммерческий проект</span> и полностью держится на энтузиазме организатора, который одновременно выступает дизайнером, администратором и меценатом проекта.<br><br>
Призовой фонд здесь может показаться скромным - и это нормально для такого формата. Если кто-то хочет поддержать проект или стать спонсором - напишите организатору (он будет рад и благодарен).<br><br>
Целью проекта является создание творческой площадки для развития участников, а также <span style='color:#da6a1b;'>поддержка андеграунд движения</span> в Германии. Призовые - это скорее бонус, а не основная цель.<br><br>
Общий призовой фонд на данный момент - около 800€ (может расти со временем)<br><br>
1 место - 300€<br>
2 место - 200€<br>
3 место - 100€<br><br>
Лучший трек раунда - 30€` }} />
            )}
    />
    <span className="taster-label" style={{ "--x": "13.6%", "--y": "64.5%"}}>
      призовые
    </span>

          {/* ── taster: судьи — data-film-source="judgesContent" ── */}
          <button
            className={`taster-btn${pressedBtn === "judges" ? " is-pressed" : ""}`}
            style={{ "--x": "62%", "--y": "43.3%" }}
            aria-label="Судьи"
            {...pointerHandlers("judges")}
            onClick={() => openFilm(judgesContent)}
          />
          <span className="taster-label" style={{ "--x": "62%", "--y": "50%" }}>судьи</span>

          {/* ── taster-btn-link telegram — x:13.6% y:78.5% ── */}
          <a
            className="taster-btn taster-btn-link taster-btn-telegram"
            href="https://t.me/bt049"
            target="_blank"
            rel="noopener noreferrer"
            style={{ "--x": "13.6%", "--y": "78.5%" }}
            aria-label="Telegram"
          >
            <img src="images/telegram-icon.png" alt="" aria-hidden="true" />
          </a>
          <span className="taster-label" style={{ "--x": "14%", "--y": "85.3%", color: "#da6a1b" }}>telegram</span>

          {/* ── taster: концепт — data-film-source="conceptContent" ── */}
          <button
            className={`taster-btn${pressedBtn === "koncept" ? " is-pressed" : ""}`}
            style={{ "--x": "13.6%", "--y": "43.3%" }}
            aria-label="Концепт"
            {...pointerHandlers("koncept")}
            onClick={() => openFilm(conceptContent)}
          />
          <span className="taster-label" style={{ "--x": "13.6%", "--y": "50%", color: "#da6a1b" }}>концепт</span>

          {/* ── taster: таблица — x:86.5% y:43.3% ── */}
          <button
            className={`taster-btn${pressedBtn === "tabla" ? " is-pressed" : ""}`}
            style={{ "--x": "86.5%", "--y": "43.3%" }}
            aria-label="Таблица"
            {...pointerHandlers("tabla")}
            onClick={() => navigate("/tabelle")}
          />
          <span className="taster-label" style={{ "--x": "86.5%", "--y": "50%" }}>таблица</span>

          {/* ── sampler link zone ── */}
          <a
            className="sampler-link-zone"
            href="https://t.me/bt049"
            target="_blank"
            rel="noopener noreferrer"
            style={{ "--x": "62%", "--y": "57.5%", "--w": "58.6%", "--h": "6.4%" }}
            aria-label="Перейти на страницу батла"
          />

          <div className="grid-layer" />
        </section>
      </main>

      {/* ── film panel ── */}
      <aside
        className={`film-panel${panelOpen ? " is-open" : ""}`}
        id="filmPanel"
        aria-hidden={!panelOpen}
      >
        <div className="film-shell">
          <div className="film-close-wrap">
            <span className="film-close-label">закрыть</span>
            <button
              className="film-close"
              id="filmClose"
              type="button"
              aria-label="Закрыть пленку"
              onClick={closeFilm}
            />
          </div>

          <div className="film-scroll" id="filmScroll" ref={filmScrollRef}>
            <div className="film-strip">
              <div className="film-content" id="filmText">
                {filmContent}
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* ── footer ── */}
      <footer className="site-footer">
        <div className="site-footer-links">
          <button
            className="footer-modal-link"
            type="button"
            onClick={() => openInfoModal(impressumContent)}
          >
            Impressum
          </button>
          <button
            className="footer-modal-link"
            type="button"
            onClick={() => openInfoModal(datenschutzContent)}
          >
            Datenschutz
          </button>
          <button
      className="footer-modal-link"
      type="button"
      onClick={() => navigate("/admin")}
    >
      Admin
    </button>
        </div>
      </footer>

      {/* ── info modal ── */}
      <div
        className={`info-modal${modalOpen ? " is-open" : ""}`}
        id="infoModal"
        aria-hidden={!modalOpen}
      >
        <div className="info-modal-backdrop" id="infoModalBackdrop" onClick={closeInfoModal} />
        <div className="info-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="infoModalTitle">
          <button
            className="info-modal-close"
            id="infoModalClose"
            type="button"
            aria-label="Закрыть окно"
            onClick={closeInfoModal}
          />
          <div className="info-modal-content" id="infoModalContent">
            {modalContent}
          </div>
        </div>
      </div>
    </>
  );
}

// ── hidden source content (mirrors the hidden <div>s in the HTML) ─────────

const judgesContent = (
  <div className="judge-list">
    <article className="judge-card">
      <img className="judge-photo" src="images/judge-tasay.jpg" alt="Tasay" />
      <div className="judge-info">
        <h3 className="judge-name">Tasay</h3>
        <p className="judge-text">
          Здесь будет описание судьи Tasay: бэкграунд, опыт, подход к оценке, музыкальный стиль и вся нужная информация.
        </p>
      </div>
    </article>

    <article className="judge-card">
      <img className="judge-photo" src="images/judge-maxmannaz.jpg" alt="MAXMANNAZ" />
      <div className="judge-info">
        <h3 className="judge-name">MAXMANNAZ</h3>
        <p className="judge-text">
          Здесь будет описание судьи MAXMANNAZ: стиль, опыт, регалии и личный подход к оценке участников.
        </p>
      </div>
    </article>
  </div>
);

const conceptContent = (
  <span dangerouslySetInnerHTML={{
    __html:
      `<u>КОНЦЕПТ</u><br><br>
    Проект создан как площадка для <span style='color:#da6a1b;'>андеграунд-исполнителей.</span><br>
    Здесь можно показать себя, познакомиться с другими участниками и попробовать новые идеи <span style='color:#da6a1b;'>без давления качества звука и продакшена.</span><br><br>
    Формат батла - <span style='color:#da6a1b;'>намеренно сырой.</span><br>
    Сведение и чистота звучания не являются ключевыми критериями.<br>
    Основной акцент - на <span style='color:#da6a1b;'>необычной подаче, идее, тексте</span><br>
    При этом важен не только прямой смысл. Иногда форма, в которой он скрыт, работает сильнее самого содержания.<br><br>
    Проект ориентирован на тех, кто:<br>
    <span style='color:#da6a1b;'>
      делает нестандартную музыку<br>
      хочет экспериментировать<br>
      ценит неочевидные решения
    </span><br><br>
    Если тебе есть что показать - записывай и отправляй трек на отбор. Если хочешь быть зрителем и просто следить за батлом - также вступай в группу телеграмм`
  }} />
);

const impressumContent = (
  <span dangerouslySetInnerHTML={{
    __html:
      `<h2 id="infoModalTitle">Impressum</h2>

    <p><strong>Angaben gemäß § 5 DDG</strong></p>

    <p>
      A P<br>
      Str. 0<br>
      4 g<br>
      Deutschland
    </p>

    <p>
      <strong>Kontakt:</strong><br>
      E-Mail: <a href="mailto:tasay.lxp@gmail.com">tasay.lxp@gmail.com</a>
    </p>

    <p>
      <strong>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV:</strong><br>
      A P<br>
      Str. 0<br>
      4 g<br>
      Deutschland
    </p>

    <p>
      <strong>Projekt:</strong><br>
      0.49 — сырой батл
    </p>

    <p><strong>Haftung für Inhalte</strong></p>
    <p>
      Als Diensteanbieter bin ich für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich.
      Für die Inhalte der teilnehmenden Künstlerinnen und Künstler übernehme ich keine Gewähr.
      Rechtswidrige Inhalte werden nach Kenntnisnahme geprüft und, soweit erforderlich, entfernt.
    </p>

    <p><strong>Haftung für Links</strong></p>
    <p>
      Diese Website kann Links zu externen Websites enthalten. Für deren Inhalte sind ausschließlich die jeweiligen
      Betreiber verantwortlich. Zum Zeitpunkt der Verlinkung waren keine rechtswidrigen Inhalte erkennbar.
    </p>

    <p><strong>Urheberrecht</strong></p>
    <p>
      Die auf dieser Website verwendeten Inhalte, Texte, Grafiken, Videos und Gestaltungselemente unterliegen dem
      Urheberrecht. Eine Nutzung ohne Zustimmung ist nicht erlaubt, soweit sie nicht gesetzlich gestattet ist.
    </p>

    <p>
      Mit der Teilnahme erklären sich die Künstler damit einverstanden, dass ihre Künstlernamen und Battle-Ergebnisse
      im Rahmen des Projekts „0.49" veröffentlicht werden dürfen.
    </p>`
  }} />
);

const datenschutzContent = (
  <span dangerouslySetInnerHTML={{
    __html:
      `<h2 id="infoModalTitle">Datenschutzerklärung</h2>

    <p><strong>1. Verantwortlicher</strong></p>
    <p>
      A P<br>
      Str. 0<br>
      4 g<br>
      E-Mail: <a href="mailto:tasay.lxp@gmail.com">tasay.lxp@gmail.com</a>
    </p>

    <p><strong>2. Allgemeine Hinweise</strong></p>
    <p>
      Diese Website dient ausschließlich der Information über das Projekt „0.49".
    </p>
    <p>
      Es werden keine Benutzerkonten erstellt und keine personenbezogenen Daten aktiv erhoben.
    </p>

    <p><strong>3. Server-Logfiles</strong></p>
    <p>
      Beim Besuch der Website verarbeitet der Hosting-Anbieter automatisch technische Daten, die zur Bereitstellung
      und Sicherheit der Website erforderlich sind. Dazu können insbesondere gehören:
    </p>
    <p>
      - IP-Adresse<br>
      - Datum und Uhrzeit des Zugriffs<br>
      - Browsertyp<br>
      - Betriebssystem<br>
      - aufgerufene Seiten
    </p>
    <p>
      Die Verarbeitung erfolgt auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO.
    </p>

    <p><strong>4. Keine Cookies / kein Tracking</strong></p>
    <p>
      Diese Website verwendet keine Analyse-, Werbe- oder Tracking-Tools.
    </p>

    <p><strong>5. Veröffentlichung von Künstlernamen</strong></p>
    <p>
      Im Rahmen des Projekts können Künstlernamen, Tracktitel und öffentliche Inhalte veröffentlicht werden, die von den
      jeweiligen Künstlern selbst öffentlich verwendet werden.
    </p>

    <p><strong>6. Rechte betroffener Personen</strong></p>
    <p>
      Betroffene Personen haben die Rechte nach der DSGVO, insbesondere auf Auskunft, Berichtigung und Löschung.
    </p>

    <p>
      <strong>Kontakt:</strong><br>
      <a href="mailto:tasay.lxp@gmail.com">tasay.lxp@gmail.com</a>
    </p>

    <p><strong>Stand:</strong> Mai 2026</p>`
  }} />
);