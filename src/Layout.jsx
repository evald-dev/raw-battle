import { Outlet } from "react-router-dom";

export default function Layout() {
  return (
    <>
      <div className="video-bg" aria-hidden="true">
        <video autoPlay muted loop playsInline preload="auto">
          <source src="videos/tv-noise.mp4" type="video/mp4" />
        </video>
      </div>

      <Outlet />
    </>
  );
}