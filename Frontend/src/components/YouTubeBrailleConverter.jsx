import { useState, useRef, useEffect, useMemo } from "react";
import { Play, Loader2, AlertCircle, Download, Copy, Check } from "lucide-react";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { toBraille } from "../lib/braille";

const YouTubeBrailleConverter = () => {
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [captions, setCaptions] = useState([]);
  const [videoId, setVideoId] = useState("");
  const [embedUrl, setEmbedUrl] = useState("");
  const [currentCaptionIndex, setCurrentCaptionIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [iframeRef, setIframeRef] = useState(null);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [displayMode, setDisplayMode] = useState("braille");
  const [syncEnabled, setSyncEnabled] = useState(true);
  const videoContainerRef = useRef(null);

  const currentCaption = useMemo(
    () => captions[currentCaptionIndex] || null,
    [captions, currentCaptionIndex]
  );

  const currentBraille = useMemo(
    () => (currentCaption ? toBraille(currentCaption.text) : ""),
    [currentCaption]
  );

  useEffect(() => {
    if (!syncEnabled || captions.length === 0) return;

    const handleMessage = (e) => {
      if (e.origin !== "https://www.youtube.com") return;
      if (e.data.type === "infoDelivery" && e.data.info?.currentTime) {
        const time = e.data.info.currentTime;
        setCurrentTime(time);

        const index = captions.findIndex(
          (cap) => time >= cap.start && time < cap.start + cap.duration
        );

        if (index !== -1 && index !== currentCaptionIndex) {
          setCurrentCaptionIndex(index);
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [syncEnabled, captions, currentCaptionIndex]);

  const extractVideoId = (url) => {
    if (url.includes("youtube.com/watch?v=")) {
      return url.split("youtube.com/watch?v=")[1].substring(0, 11);
    }
    if (url.includes("youtu.be/")) {
      return url.split("youtu.be/")[1].substring(0, 11);
    }
    if (url.includes("youtube.com/embed/")) {
      return url.split("youtube.com/embed/")[1].substring(0, 11);
    }
    return null;
  };

  const fetchCaptions = async (e) => {
    e.preventDefault();
    setError("");
    setCaptions([]);
    setCurrentCaptionIndex(0);
    setVideoId("");
    setEmbedUrl("");

    if (!youtubeUrl.trim()) {
      setError("Please enter a YouTube URL");
      return;
    }

    const vId = extractVideoId(youtubeUrl);
    if (!vId) {
      setError("Invalid YouTube URL format");
      return;
    }

    setLoading(true);

    try {
      const response = await axiosInstance.post("/youtube/captions", {
        url: youtubeUrl,
      });

      const { captions: fetchedCaptions, videoId: vId } = response.data;

      setCaptions(fetchedCaptions);
      setVideoId(vId);
      setEmbedUrl("https://www.youtube.com/embed/" + vId);
      setCurrentCaptionIndex(0);

      toast.success("Loaded " + fetchedCaptions.length + " captions");
    } catch (err) {
      const message =
        err.response?.data?.error || err.message || "Failed to fetch captions";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCaption = (text, index) => {
    const brailleText = toBraille(text);
    navigator.clipboard.writeText(brailleText);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
    toast.success("Copied to clipboard!");
  };

  const handleDownloadCaptions = () => {
    if (captions.length === 0) return;

    const content = captions
      .map((cap) => {
        const braille = toBraille(cap.text);
        return "[" + cap.start.toFixed(2) + "s]\nText: " + cap.text + "\nBraille: " + braille + "\n";
      })
      .join("\n---\n\n");

    const element = document.createElement("a");
    element.setAttribute(
      "href",
      "data:text/plain;charset=utf-8," + encodeURIComponent(content)
    );
    element.setAttribute(
      "download",
      "youtube-captions-" + videoId + "-" + Date.now() + ".txt"
    );
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);

    toast.success("Captions downloaded!");
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-6">
        <form onSubmit={fetchCaptions} className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-700">
              YouTube URL
            </label>
            <div className="flex gap-2 flex-col md:flex-row">
              <input
                type="text"
                placeholder="https://www.youtube.com/watch?v=VIDEO_ID"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                className="flex-1 px-4 py-3 rounded-lg border border-slate-300 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-60 transition-all whitespace-nowrap"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" /> Load Captions
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Supports youtube.com, youtu.be, and embed URLs
            </p>
          </div>
        </form>

        {error && (
          <div className="mt-4 flex items-start gap-3 p-4 rounded-lg bg-red-50 border border-red-200">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-red-800 text-sm">{error}</p>
              <p className="text-xs text-red-700 mt-1">
                Make sure the video has captions enabled.
              </p>
            </div>
          </div>
        )}
      </div>

      {videoId && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-2xl border border-slate-200 shadow-lg overflow-hidden bg-black">
              <div
                ref={videoContainerRef}
                className="relative w-full"
                style={{ paddingBottom: "56.25%" }}
              >
                <iframe
                  ref={setIframeRef}
                  className="absolute top-0 left-0 w-full h-full"
                  src={embedUrl + "?enablejsapi=1&rel=0&modestbranding=1"}
                  title="YouTube video player"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
            </div>

            <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-blue-50 border border-blue-200">
              <input
                type="checkbox"
                id="syncToggle"
                checked={syncEnabled}
                onChange={(e) => setSyncEnabled(e.target.checked)}
                className="w-4 h-4 rounded accent-blue-600 cursor-pointer"
              />
              <label
                htmlFor="syncToggle"
                className="flex-1 text-sm font-medium text-slate-700 cursor-pointer"
              >
                Sync captions with video playback
              </label>
            </div>
          </div>

          <div className="lg:col-span-1 space-y-4">
            <div className="flex gap-2 p-1 rounded-lg bg-slate-100">
              <button
                onClick={() => setDisplayMode("braille")}
                className={
                  "flex-1 px-3 py-2 rounded text-sm font-medium transition-all " +
                  (displayMode === "braille"
                    ? "bg-white text-slate-800 shadow-sm"
                    : "text-slate-600 hover:text-slate-800")
                }
              >
                Braille
              </button>
              <button
                onClick={() => setDisplayMode("text")}
                className={
                  "flex-1 px-3 py-2 rounded text-sm font-medium transition-all " +
                  (displayMode === "text"
                    ? "bg-white text-slate-800 shadow-sm"
                    : "text-slate-600 hover:text-slate-800")
                }
              >
                Text
              </button>
            </div>

            <div className="rounded-2xl border border-slate-200 shadow-lg p-6 space-y-4 bg-white sticky top-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Current Caption
              </p>

              {currentCaption ? (
                <>
                  {displayMode === "braille" ? (
                    <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 min-h-[120px] flex items-center justify-center">
                      <p className="font-mono text-xl md:text-2xl tracking-widest leading-relaxed text-amber-800 break-all text-center">
                        {currentBraille || "No text"}
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 min-h-[120px]">
                      <p className="text-sm text-slate-800 leading-relaxed">
                        {currentCaption.text}
                      </p>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() =>
                        handleCopyCaption(currentCaption.text, currentCaptionIndex)
                      }
                      className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-all"
                    >
                      {copiedIndex === currentCaptionIndex ? (
                        <>
                          <Check className="w-4 h-4" /> Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" /> Copy
                        </>
                      )}
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <p className="text-sm italic">No captions available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {captions.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-slate-800">
                Caption Library ({captions.length})
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                All captions with Braille conversion
              </p>
            </div>
            <button
              onClick={handleDownloadCaptions}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-all"
            >
              <Download className="w-4 h-4" /> Download
            </button>
          </div>

          <div className="divide-y max-h-96 overflow-y-auto">
            {captions.map((caption, idx) => (
              <div
                key={idx}
                onClick={() => setCurrentCaptionIndex(idx)}
                className={
                  "p-4 cursor-pointer transition-all border-l-4 " +
                  (idx === currentCaptionIndex
                    ? "bg-blue-50 border-blue-600"
                    : "border-transparent hover:bg-slate-50")
                }
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1">
                    <p className="text-xs font-mono text-slate-500 mb-1">
                      {caption.start.toFixed(2)}s
                    </p>
                    <p className="text-sm text-slate-700 font-medium leading-relaxed">
                      {caption.text}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopyCaption(caption.text, idx);
                    }}
                    className={
                      "p-2 rounded transition-all " +
                      (copiedIndex === idx
                        ? "bg-green-100 text-green-600"
                        : "hover:bg-slate-100 text-slate-400 hover:text-slate-600")
                    }
                  >
                    {copiedIndex === idx ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>

                <div className="rounded-lg bg-amber-50 border border-amber-100 p-2">
                  <p className="font-mono text-xs tracking-wider text-amber-700">
                    {toBraille(caption.text)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-xs text-slate-600 space-y-2">
        <p>
          <strong>Tip:</strong> Click any caption to jump to it.
        </p>
        <p>
          <strong>Accessibility:</strong> Braille display updates in real-time as the video plays.
        </p>
        <p>
          <strong>Export:</strong> Download all captions as a text file.
        </p>
      </div>
    </div>
  );
};

export default YouTubeBrailleConverter;
