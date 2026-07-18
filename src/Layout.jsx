import { useRef, useEffect } from "react";
import { Outlet } from "react-router-dom";

export default function Layout() {
  const bgVideoRef = useRef(null);

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

  return (
    <>
      <div className="video-bg" aria-hidden="true">
        <video ref={bgVideoRef} autoPlay muted playsInline preload="auto">
          <source src="videos/tv-noise.mp4" type="video/mp4" />
        </video>
      </div>

      <Outlet />
    </>
  );
}