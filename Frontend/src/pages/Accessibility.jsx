import { useEffect, useMemo, useRef, useState } from "react";
import { axiosInstance } from "../lib/axios";
import { Camera, Hand, Loader2, Play, Square, Wifi, WifiOff, AlertCircle, CheckCircle2, XCircle, Info } from "lucide-react";
import toast from "react-hot-toast";

const MODEL_BASE_PATH = "/my_model/";

const sortPredictions = (preds) => {
  if (!Array.isArray(preds)) return [];
  return [...preds].sort((a, b) => (b?.probability || 0) - (a?.probability || 0));
};

const Accessibility = () => {
  // -------- Vision Assist (Teachable Machine) --------
  const [visionLoading, setVisionLoading] = useState(false);
  const [visionRunning, setVisionRunning] = useState(false);
  const [predictions, setPredictions] = useState([]);
  const [visionError, setVisionError] = useState("");
  const [confidenceThreshold, setConfidenceThreshold] = useState(30);

  const modelRef = useRef(null);
  const webcamRef = useRef(null);
  const rafRef = useRef(null);
  const runningRef = useRef(false);

  const canvasHostRef = useRef(null);

  const modelUrls = useMemo(() => {
    const base = MODEL_BASE_PATH.replace(/\/$/, "") + "/";
    return {
      modelURL: `${base}model.json`,
      metadataURL: `${base}metadata.json`,
    };
  }, []);

  const ensureVisionModel = async () => {
    if (modelRef.current) return modelRef.current;

    setVisionLoading(true);
    setVisionError("");
    try {
      await import("@tensorflow/tfjs");
      const tmImage = await import("@teachablemachine/image");
      const loaded = await tmImage.load(modelUrls.modelURL, modelUrls.metadataURL);
      modelRef.current = loaded;
      return loaded;
    } catch (e) {
      setVisionError(
        `Model load failed: ${e?.message || "model files not found at " + MODEL_BASE_PATH}`
      );
      throw e;
    } finally {
      setVisionLoading(false);
    }
  };

  const cleanupWebcamCanvas = () => {
    if (canvasHostRef.current) {
      canvasHostRef.current.innerHTML = "";
    }
  };

  const stopVision = async () => {
    runningRef.current = false;
    setVisionRunning(false);

    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    try {
      if (webcamRef.current) {
        webcamRef.current.stop();
        webcamRef.current = null;
      }
    } catch {
      // ignore
    }

    cleanupWebcamCanvas();
  };

  const loop = async () => {
    if (!runningRef.current) return;

    const webcam = webcamRef.current;
    const model = modelRef.current;

    if (!webcam || !model) {
      await stopVision();
      return;
    }

    webcam.update();

    try {
      const preds = await model.predict(webcam.canvas);
      setPredictions(sortPredictions(preds));
    } catch {
      // ignore prediction errors; keep loop alive
    }

    rafRef.current = requestAnimationFrame(loop);
  };

  const startVision = async () => {
    if (visionRunning) return;

    setVisionLoading(true);
    setVisionError("");
    setPredictions([]);
    try {
      const model = await ensureVisionModel();
      const tmImage = await import("@teachablemachine/image");

      const webcam = new tmImage.Webcam(360, 270, true);
      await webcam.setup();
      await webcam.play();

      webcamRef.current = webcam;

      cleanupWebcamCanvas();
      if (canvasHostRef.current) {
        canvasHostRef.current.appendChild(webcam.canvas);
      }

      runningRef.current = true;
      setVisionRunning(true);

      try {
        await model.predict(webcam.canvas);
      } catch {
        // ignore warm-up errors
      }

      rafRef.current = requestAnimationFrame(loop);
    } catch (e) {
      setVisionError(e?.message || "Failed to start camera or load model");
      await stopVision();
    } finally {
      setVisionLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      stopVision();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -------- Gesture controls (Flask bridge via AgriHub backend) --------
  const [gestureStatus, setGestureStatus] = useState("stopped"); // "stopped" | "starting" | "running" | "stopping" | "error"
  const [gestureError, setGestureError] = useState("");

  const startGesture = async () => {
    setGestureStatus("starting");
    setGestureError("");
    try {
      const res = await axiosInstance.post("/gesture/start");
      setGestureStatus("running");
      toast.success(res?.data?.message || "Gesture control started");
    } catch (e) {
      setGestureStatus("error");
      setGestureError(
        e?.response?.data?.message || e?.message || "Could not reach gesture service"
      );
    }
  };

  const stopGesture = async () => {
    setGestureStatus("stopping");
    setGestureError("");
    try {
      const res = await axiosInstance.post("/gesture/stop");
      setGestureStatus("stopped");
      toast.success(res?.data?.message || "Gesture control stopped");
    } catch (e) {
      setGestureStatus("error");
      setGestureError(
        e?.response?.data?.message || e?.message || "Could not reach gesture service"
      );
    }
  };

  const filteredPredictions = useMemo(
    () => predictions.filter((p) => Math.round((p?.probability || 0) * 100) >= confidenceThreshold),
    [predictions, confidenceThreshold]
  );

  const gestureStatusConfig = {
    stopped: { label: "Stopped", icon: <WifiOff className="w-4 h-4" />, color: "text-slate-500", bg: "bg-slate-100" },
    starting: { label: "Starting…", icon: <Loader2 className="w-4 h-4 animate-spin" />, color: "text-amber-600", bg: "bg-amber-50" },
    running: { label: "Active", icon: <Wifi className="w-4 h-4" />, color: "text-green-600", bg: "bg-green-50" },
    stopping: { label: "Stopping…", icon: <Loader2 className="w-4 h-4 animate-spin" />, color: "text-amber-600", bg: "bg-amber-50" },
    error: { label: "Error", icon: <XCircle className="w-4 h-4" />, color: "text-red-600", bg: "bg-red-50" },
  };

  const gs = gestureStatusConfig[gestureStatus] || gestureStatusConfig.stopped;

  return (
    <div className="min-h-screen bg-transparent">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Accessibility</h1>
            <p className="text-sm text-slate-600 mt-1">Vision Assist + Gesture Control</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* Vision Assist */}
          <div className="bg-white/70 backdrop-blur-md rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-teal-600 flex items-center justify-center text-white">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-800">Vision Assist</h2>
                  <p className="text-xs text-slate-500">Teachable Machine image classification</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={startVision}
                  disabled={visionLoading || visionRunning}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 disabled:opacity-60 transition-all"
                >
                  {visionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  {visionLoading ? "Loading…" : "Start"}
                </button>
                <button
                  onClick={stopVision}
                  disabled={visionLoading || !visionRunning}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50 disabled:opacity-60 transition-all"
                >
                  <Square className="w-4 h-4" />
                  Stop
                </button>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {/* Camera / placeholder area */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden min-h-[200px] flex items-center justify-center relative">
                {visionLoading ? (
                  <div className="flex flex-col items-center gap-2 py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-teal-500" />
                    <p className="text-sm text-slate-500">Loading model &amp; camera…</p>
                  </div>
                ) : (
                  <>
                    <div
                      ref={canvasHostRef}
                      className="w-full flex justify-center p-3"
                      style={{ display: visionRunning ? "flex" : "none" }}
                    />
                    {!visionRunning && (
                      <div className="flex flex-col items-center gap-2 py-8 px-4 text-center">
                        <Camera className="w-8 h-8 text-slate-300" />
                        <p className="text-sm text-slate-500">Press <strong>Start</strong> to begin camera classification</p>
                        <p className="text-xs text-slate-400">
                          Model: <span className="font-mono">{MODEL_BASE_PATH}</span>
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Error state */}
              {visionError && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold">Vision Assist Error</p>
                    <p className="mt-0.5">{visionError}</p>
                    <p className="mt-1 text-red-600/70">
                      Make sure model files exist at <span className="font-mono">Frontend/public/my_model/</span>
                    </p>
                  </div>
                </div>
              )}

              {/* Threshold slider */}
              {visionRunning && (
                <div className="flex items-center gap-3">
                  <label className="text-xs font-semibold text-slate-600 shrink-0">Min confidence:</label>
                  <input
                    type="range"
                    min="10"
                    max="90"
                    step="5"
                    value={confidenceThreshold}
                    onChange={(e) => setConfidenceThreshold(Number(e.target.value))}
                    className="flex-1 h-1.5 rounded-full bg-slate-200 appearance-none cursor-pointer accent-teal-600"
                  />
                  <span className="text-xs font-semibold text-slate-700 w-8">{confidenceThreshold}%</span>
                </div>
              )}

              {/* Predictions */}
              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-slate-800">
                    Predictions
                    {visionRunning && predictions.length > 0 && (
                      <span className="ml-2 text-xs font-normal text-slate-500">
                        (showing ≥{confidenceThreshold}%)
                      </span>
                    )}
                  </p>
                  {visionRunning && predictions.length > 0 && (
                    <span className="text-xs text-slate-400">{predictions.length} classes detected</span>
                  )}
                </div>

                {filteredPredictions.length === 0 ? (
                  <p className="text-sm text-slate-400 italic py-2">
                    {visionRunning ? `No predictions above ${confidenceThreshold}% confidence` : "Start camera to see predictions"}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {filteredPredictions.slice(0, 5).map((p) => {
                      const name = p?.className || "Unknown";
                      const prob = Math.round((p?.probability || 0) * 100);
                      const isTop = p === filteredPredictions[0];
                      return (
                        <div key={name} className="flex items-center gap-3">
                          <div className="w-28 text-sm text-slate-700 truncate font-medium">{name}</div>
                          <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${isTop ? "bg-teal-600" : "bg-teal-400"}`}
                              style={{ width: `${prob}%` }}
                            />
                          </div>
                          <div className="w-10 text-right text-xs font-semibold text-slate-600">{prob}%</div>
                          {isTop && <CheckCircle2 className="w-3.5 h-3.5 text-teal-500 shrink-0" />}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Gesture Control */}
          <div className="bg-white/70 backdrop-blur-md rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-purple-600 flex items-center justify-center text-white">
                  <Hand className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-800">Gesture Control</h2>
                  <p className="text-xs text-slate-500">Flask mouse-control via AgriHub backend</p>
                </div>
              </div>

              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${gs.bg} ${gs.color} border-opacity-60`}>
                {gs.icon}
                {gs.label}
              </div>
            </div>

            <div className="p-5 space-y-4">
              {/* Status card */}
              <div className={`rounded-2xl border p-4 ${
                gestureStatus === "running"
                  ? "bg-green-50 border-green-200"
                  : gestureStatus === "error"
                  ? "bg-red-50 border-red-200"
                  : "bg-slate-50 border-slate-200"
              }`}>
                {gestureStatus === "running" ? (
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-green-800">Gesture service active</p>
                      <p className="text-xs text-green-700 mt-0.5">Move your hand in front of the camera to control the mouse.</p>
                    </div>
                  </div>
                ) : gestureStatus === "error" ? (
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-red-800">Connection failed</p>
                      <p className="text-xs text-red-700 mt-0.5">{gestureError}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-slate-500 mt-0.5" />
                    <div>
                      <p className="text-sm text-slate-700">
                        Forwarded to your Flask service at <span className="font-mono">GESTURE_SERVICE_URL</span>.
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">Start the service first, then click Start here.</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Error detail */}
              {gestureStatus === "error" && gestureError && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-700 font-mono">
                  {gestureError}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-3">
                <button
                  onClick={startGesture}
                  disabled={gestureStatus === "starting" || gestureStatus === "running"}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all flex-1"
                >
                  {gestureStatus === "starting" ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Starting…</>
                  ) : (
                    <><Play className="w-4 h-4" /> Start Gesture</>
                  )}
                </button>
                <button
                  onClick={stopGesture}
                  disabled={gestureStatus === "stopped" || gestureStatus === "stopping"}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed transition-all flex-1"
                >
                  {gestureStatus === "stopping" ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Stopping…</>
                  ) : (
                    <><Square className="w-4 h-4" /> Stop</>
                  )}
                </button>
              </div>

              {/* Setup info */}
              <div className="rounded-lg border border-slate-100 p-3 text-xs text-slate-500 space-y-1">
                <p className="font-semibold text-slate-600 mb-1">Setup requirements:</p>
                <p>1. Run your Flask gesture service (hand-tracking / mouse control)</p>
                <p>2. Set <span className="font-mono bg-slate-100 px-1 rounded">GESTURE_SERVICE_URL</span> in <span className="font-mono bg-slate-100 px-1 rounded">Backend/.env</span></p>
                <p>3. Allow camera access when prompted</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Accessibility;
