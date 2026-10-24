import { useEffect, useRef, useState } from "react";

export default function WebcamCard() {
  const videoRef = useRef(null);
  const [status, setStatus] = useState("starting"); // starting | on | denied

  useEffect(() => {
    let stream;
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((s) => {
        stream = s;
        if (videoRef.current) videoRef.current.srcObject = s;
        setStatus("on");
      })
      .catch(() => setStatus("denied"));

    // cleanup: page chhodte hi webcam band
    return () => {
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <div className="bg-surface-container-low rounded-xl p-space-md shadow-lg flex flex-col gap-space-sm">
      <div className="flex items-center justify-between">
        <span className="font-telemetry-label text-telemetry-label uppercase tracking-wider text-on-surface font-semibold flex items-center gap-1">
          <span className={`w-2 h-2 rounded-full ${status === "on" ? "bg-tertiary animate-pulse" : "bg-error"}`}></span>
          Live Proctor Cam
        </span>
        <span className={`font-telemetry-label text-telemetry-label ${status === "on" ? "text-tertiary" : "text-error"}`}>
          {status === "on" ? "Camera On" : status === "denied" ? "Camera Blocked" : "Starting..."}
        </span>
      </div>

      <div className="relative w-full h-36 rounded-lg overflow-hidden bg-surface-container-lowest flex items-center justify-center">
        <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
        {status === "denied" && (
          <p className="absolute px-space-md text-center font-body-sm text-body-sm text-error">
            Please allow camera access in the browser.
          </p>
        )}
      </div>
    </div>
  );
}