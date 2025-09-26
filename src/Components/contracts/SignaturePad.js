// src/components/contracts/SignaturePad.jsx
import React, {
  useEffect,
  useImperativeHandle,
  useRef,
  forwardRef,
} from "react";

function fitCanvasToParent(canvas) {
  const parent = canvas.parentElement;
  if (!parent) return;
  const rect = parent.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;

  canvas.style.width = "100%";
  canvas.style.height = Math.max(180, Math.min(380, rect.height || 240)) + "px";

  const cssW = canvas.clientWidth || rect.width || 600;
  const cssH = canvas.clientHeight || 240;

  canvas.width = Math.round(cssW * ratio);
  canvas.height = Math.round(cssH * ratio);

  const ctx = canvas.getContext("2d");
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#111";
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, cssW, cssH);
}

const SignaturePad = forwardRef(function SignaturePad(_, ref) {
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);
  const lastRef = useRef({ x: 0, y: 0 });
  const dirtyRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    fitCanvasToParent(canvas);

    const onResize = () => fitCanvasToParent(canvas);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const posFromEvent = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const t = e.touches?.[0] || e;
    return {
      x: t.clientX - rect.left,
      y: t.clientY - rect.top,
    };
  };

  const start = (e) => {
    e.preventDefault();
    drawingRef.current = true;
    lastRef.current = posFromEvent(e);
  };

  const move = (e) => {
    if (!drawingRef.current) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext("2d");
    const p = posFromEvent(e);
    ctx.beginPath();
    ctx.moveTo(lastRef.current.x, lastRef.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    lastRef.current = p;
    dirtyRef.current = true;
  };

  const end = (e) => {
    if (!drawingRef.current) return;
    e.preventDefault();
    drawingRef.current = false;
  };

  const clear = () => {
    const c = canvasRef.current;
    const ctx = c.getContext("2d");
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.restore();
    fitCanvasToParent(c);
    dirtyRef.current = false;
  };

  const getDataUrl = () => {
    const c = canvasRef.current;
    // downscale to a sensible size for storage
    const maxW = 800;
    const scale = Math.min(1, maxW / c.width);
    if (scale === 1) return c.toDataURL("image/png");
    const tmp = document.createElement("canvas");
    tmp.width = Math.round(c.width * scale);
    tmp.height = Math.round(c.height * scale);
    const tctx = tmp.getContext("2d");
    tctx.fillStyle = "#fff";
    tctx.fillRect(0, 0, tmp.width, tmp.height);
    tctx.drawImage(c, 0, 0, tmp.width, tmp.height);
    return tmp.toDataURL("image/png");
  };

  useImperativeHandle(ref, () => ({
    clear,
    getDataUrl,
    isEmpty: () => !dirtyRef.current,
  }));

  return (
    <div className="border rounded p-2" style={{ background: "#fff" }}>
      <canvas
        ref={canvasRef}
        style={{
          width: "100%",
          display: "block",
          touchAction: "none",
          cursor: "crosshair",
        }}
        onMouseDown={start}
        onMouseMove={move}
        onMouseUp={end}
        onMouseLeave={end}
        onTouchStart={start}
        onTouchMove={move}
        onTouchEnd={end}
      />
      <div className="d-flex justify-content-end">
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary mt-2"
          onClick={() => ref.current?.clear()}
        >
          Clear
        </button>
      </div>
    </div>
  );
});

export default SignaturePad;
