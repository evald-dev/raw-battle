const TasterButton = ({
  id,
  label,
  pressedBtn,
  pointerHandlers,
  onClick,
  ariaLabel,
  x,
  y,
  labelY,
}) => (
  <>
    <button
      className={`taster-btn${pressedBtn === id ? " is-pressed" : ""}`}
      style={{ "--x": x, "--y": y }}
      aria-label={ariaLabel ?? label}
      {...pointerHandlers(id)}
      onClick={onClick}
    />
    <span className="taster-label" style={{ "--x": x, "--y": labelY ?? y }}>
      {label}
    </span>
  </>
);

export default TasterButton;