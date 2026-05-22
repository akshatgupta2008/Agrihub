import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "../store/useAuthStore";

const Feedback = () => {
  const authUser = useAuthStore((s) => s.authUser);

  // Hooks must always run in the same order, so we compute safe defaults first.
  const initialName = authUser?.fullName || "";
  const initialEmail = authUser?.email || "";

  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [rating, setRating] = useState(5);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setName(initialName);
    setEmail(initialEmail);
  }, [initialName, initialEmail]);

  if (!authUser) return <Navigate to="/farmer/login" replace />;
  if (authUser.role !== "patient") return <Navigate to="/" replace />;

  const submit = async () => {
    const cleanMessage = String(message || "").trim();
    if (cleanMessage.length < 3) {
      toast.error("Please enter your feedback");
      return;
    }

    setSubmitting(true);
    try {
      await axiosInstance.post("/feedback", {
        name: String(name || "").trim(),
        email: String(email || "").trim(),
        rating: Number(rating),
        message: cleanMessage,
      });
      toast.success("Feedback submitted");
      setMessage("");
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to submit feedback");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="bg-white/70 backdrop-blur-md rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100">
          <h1 className="text-lg font-bold text-slate-800">Feedback</h1>
          <p className="text-sm text-slate-500 mt-1">Share your experience so we can improve AgriHub.</p>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Name (optional)</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="Your name"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email (optional)</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Rating</label>
            <select
              value={rating}
              onChange={(e) => setRating(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            >
              <option value={5}>5 - Excellent</option>
              <option value={4}>4 - Good</option>
              <option value={3}>3 - Okay</option>
              <option value={2}>2 - Bad</option>
              <option value={1}>1 - Very bad</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Message</label>
            <textarea
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell us what went well, what didn’t, and what you want next…"
              className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>

          <button
            type="button"
            onClick={submit}
            disabled={submitting}
            className="w-full py-3 rounded-lg bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 disabled:opacity-50 transition-all"
          >
            {submitting ? "Submitting…" : "Submit Feedback"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Feedback;
