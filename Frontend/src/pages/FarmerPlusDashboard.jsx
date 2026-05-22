import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock,
  Download,
  Headset,
  HeartHandshake,
  LogOut,
  Pill,
  ShieldAlert,
  TrendingUp,
  User,
  Video,
  FileText,
  XCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { axiosInstance } from "../lib/axios";
import { calculateFarmScore, getFarmDos, getFarmDonts, getInputRecommendations, getReportSummary } from "../lib/farmInsights";
import toast from "react-hot-toast";
import { useAuthStore } from "../store/useAuthStore";
import { StarRating } from "../components/StarRating";

const FarmerPlusDashboard = () => {
  const { authUser, logout } = useAuthStore();
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState([]);
  const [times, setTimes] = useState([]);
  const [latestReport, setLatestReport] = useState(null);
  const [reports, setReports] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [appointmentsPage, setAppointmentsPage] = useState(1);
  const [appointmentsHasMore, setAppointmentsHasMore] = useState(false);
  const [appointmentsLoadingMore, setAppointmentsLoadingMore] = useState(false);
  const [appointmentsVisible, setAppointmentsVisible] = useState(3);

  const [reviewedByApptId, setReviewedByApptId] = useState({});
  const [openReviewApptId, setOpenReviewApptId] = useState("");
  const [reviewDraftByApptId, setReviewDraftByApptId] = useState({});
  const [reviewBusyApptId, setReviewBusyApptId] = useState("");

  const [booking, setBooking] = useState({ doctorId: "", date: "", time: "", mode: "offline" });
  const [loading, setLoading] = useState(true);
  const [bookingBusy, setBookingBusy] = useState(false);

  const doctorById = useMemo(() => new Map(doctors.map((d) => [d._id, d])), [doctors]);
  const apiBase = useMemo(() => (axiosInstance.defaults.baseURL || "").replace(/\/$/, ""), []);

  const load = async () => {
    setLoading(true);
    try {
      const [dRes, rRes, allReportsRes, aRes, myReviewsRes] = await Promise.all([
        axiosInstance.get("/patient-dashboard/doctors"),
        axiosInstance.get("/patient-dashboard/reports/latest"),
        axiosInstance.get("/patient-dashboard/reports"),
        axiosInstance.get("/patient-dashboard/appointments?page=1&limit=5"),
        axiosInstance.get("/patient-dashboard/reviews"),
      ]);
      setDoctors(dRes.data);
      setLatestReport(rRes.data);
      setReports(Array.isArray(allReportsRes.data) ? allReportsRes.data : []);
      setAppointments(Array.isArray(aRes.data.appointments) ? aRes.data.appointments : (Array.isArray(aRes.data) ? aRes.data : []));
      setAppointmentsHasMore(aRes.data.hasMore ?? false);
      setAppointmentsPage(1);
      setAppointmentsVisible(3);

      const reviewMap = {};
      const reviews = Array.isArray(myReviewsRes.data) ? myReviewsRes.data : [];
      for (const r of reviews) {
        if (r?.appointment) reviewMap[String(r.appointment)] = true;
      }
      setReviewedByApptId(reviewMap);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  // Refresh appointments after voice booking (VoiceAssistant dispatches this).
  const loadMoreAppointments = async () => {
    if (appointmentsLoadingMore || !appointmentsHasMore) return;
    setAppointmentsLoadingMore(true);
    try {
      const nextPage = appointmentsPage + 1;
      const res = await axiosInstance.get(`/patient-dashboard/appointments?page=${nextPage}&limit=5`);
      const newAppts = Array.isArray(res.data.appointments) ? res.data.appointments : [];
      setAppointments((prev) => [...prev, ...newAppts]);
      setAppointmentsHasMore(res.data.hasMore ?? false);
      setAppointmentsPage(nextPage);
      setAppointmentsVisible((prev) => prev + 5);
    } catch {
      toast.error("Failed to load more bookings");
    } finally {
      setAppointmentsLoadingMore(false);
    }
  };

  // Refresh appointments after voice booking (VoiceAssistant dispatches this).
  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    const handler = () => {
      loadRef.current?.();
    };
    window.addEventListener("agrihub:appointmentsUpdated", handler);
    return () => window.removeEventListener("agrihub:appointmentsUpdated", handler);
  }, []);

  useEffect(() => {
    load();
  }, []);

  const ensureDraft = (appointmentId) => {
    setReviewDraftByApptId((prev) => {
      if (prev?.[appointmentId]) return prev;
      return { ...prev, [appointmentId]: { rating: 5, comment: "" } };
    });
  };

  const toggleReview = (appointmentId) => {
    if (!appointmentId) return;
    if (openReviewApptId === appointmentId) {
      setOpenReviewApptId("");
      return;
    }
    ensureDraft(appointmentId);
    setOpenReviewApptId(appointmentId);
  };

  const submitReview = async (appointmentId) => {
    const draft = reviewDraftByApptId?.[appointmentId];
    const ratingNum = Number(draft?.rating);
    if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      toast.error("Please select a rating from 1 to 5");
      return;
    }

    setReviewBusyApptId(appointmentId);
    try {
      await axiosInstance.post(`/patient-dashboard/appointments/${appointmentId}/review`, {
        rating: ratingNum,
        comment: String(draft?.comment || "").trim(),
      });
      toast.success("Review submitted");
      setOpenReviewApptId("");
      await load();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to submit review");
    } finally {
      setReviewBusyApptId("");
    }
  };

  useEffect(() => {
    const loadSlots = async () => {
      if (!booking.doctorId || !booking.date) {
        setTimes([]);
        return;
      }

      try {
        const res = await axiosInstance.get(`/patient-dashboard/doctors/${booking.doctorId}/slots`, {
          params: { date: booking.date },
        });
        setTimes(res.data);
      } catch {
        setTimes([]);
      }
    };

    loadSlots();
  }, [booking.doctorId, booking.date]);

  const onBook = async (e) => {
    e.preventDefault();
    if (!booking.doctorId || !booking.date || !booking.time) {
      toast.error("Select provider, date, and time");
      return;
    }

    setBookingBusy(true);
    try {
      const res = await axiosInstance.post("/patient-dashboard/appointments/book", booking);
      const status = res?.data?.status;
      if (booking.mode === "online" && status === "pending") {
        toast.success("Online request sent. Waiting for provider acceptance.");
      } else {
        toast.success("Booking confirmed successfully");
      }
      setBooking({ doctorId: "", date: "", time: "", mode: "offline" });
      setTimes([]);
      await load();
    } catch (e2) {
      toast.error(e2?.response?.data?.message || "Booking failed");
    } finally {
      setBookingBusy(false);
    }
  };

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return "Good Morning";
    if (h < 17) return "Good Afternoon";
    return "Good Evening";
  }, []);

  const patientTypeLabel = "Special Care";

  const onLogout = async () => {
    await logout();
    navigate("/");
  };

  const onAccessibility = () => {
    navigate("/accessibility");
  };

  return (
    <div className="min-h-screen bg-transparent">
      <header className="bg-white/75 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center shadow-md">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800">AgriHub</h1>
              <p className="text-xs text-slate-500">Farmer Portal</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-semibold border border-purple-200">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
              {patientTypeLabel}
            </span>
            <div className="w-9 h-9 rounded-full bg-teal-600 flex items-center justify-center text-white font-semibold text-sm">
              {authUser?.fullName?.charAt(0) || "F"}
            </div>
            <button
              onClick={onAccessibility}
              className="px-3 py-1.5 rounded-full border border-slate-300 text-slate-600 text-xs font-medium hover:bg-slate-50 transition-all"
            >
              Accessibility
            </button>
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-300 text-slate-600 text-xs font-medium hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-all"
            >
              <LogOut size={14} /> Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Welcome Banner */}
        <div className="relative bg-gradient-to-r from-teal-600 via-teal-500 to-emerald-500 rounded-2xl p-8 mb-8 overflow-hidden shadow-lg">
          <div className="absolute inset-0 opacity-10">
            <svg className="w-full h-full" viewBox="0 0 400 200">
              <circle cx="350" cy="30" r="120" fill="white" />
              <circle cx="50" cy="180" r="80" fill="white" />
            </svg>
          </div>

          <div className="relative z-10 flex items-start justify-between gap-6">
            <div>
              <p className="text-teal-100 text-sm font-medium mb-1">{greeting}</p>
              <h2 className="text-2xl font-bold text-white mb-1">{authUser?.fullName}</h2>
              <p className="text-teal-100 text-sm">{authUser?.email}</p>

              <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur text-white/90 text-xs font-semibold border border-white/20">
                <HeartHandshake className="w-4 h-4" />
                Priority allocation enabled
              </div>
            </div>

            <div className="hidden md:flex items-center gap-6 text-teal-100 text-sm">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{appointments.length}</div>
                <div className="text-teal-200 text-xs">Bookings</div>
              </div>
              <div className="w-px h-10 bg-teal-300 opacity-30" />
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{reports.length}</div>
                <div className="text-teal-200 text-xs">Reports</div>
              </div>
              <div className="w-px h-10 bg-teal-300 opacity-30" />
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{doctors.length}</div>
                <div className="text-teal-200 text-xs">Providers</div>
              </div>

              <button
                type="button"
                onClick={() => navigate("/dashboard/farmer-plus/assistive-support")}
                className="ml-3 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/15 backdrop-blur-sm text-white text-xs font-semibold border border-white/30 hover:bg-white/25 transition-all"
              >
                <Headset className="w-4 h-4" /> Accessibility Support
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: booking + appointments */}
          <div className="lg:col-span-2 space-y-6">
            {/* Booking Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-teal-500 to-teal-600 px-6 py-4 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <CalendarDays className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-sm">Request Priority Booking</h3>
                  <p className="text-teal-100 text-xs">Assisted access farmers get priority slot allocation</p>
                </div>
              </div>

              <div className="p-6">
                <form onSubmit={onBook}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Provider</label>
                      <select
                        className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                        value={booking.doctorId}
                        onChange={(e) => setBooking((p) => ({ ...p, doctorId: e.target.value, time: "" }))}
                        required
                      >
                        <option value="">Select a provider</option>
                        {doctors.map((d) => (
                          <option key={d._id} value={d._id}>
                            {d.fullName} {d.specialty ? `— ${d.specialty}` : ""}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Date</label>
                      <input
                        type="date"
                        className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                        value={booking.date}
                        onChange={(e) => setBooking((p) => ({ ...p, date: e.target.value, time: "" }))}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Mode</label>
                      <select
                        className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                        value={booking.mode}
                        onChange={(e) => setBooking((p) => ({ ...p, mode: e.target.value }))}
                      >
                        <option value="offline">🚜 On-site Visit</option>
                        <option value="online">📞 Remote Call</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Time Slot</label>
                      <select
                        className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all disabled:opacity-50"
                        value={booking.time}
                        onChange={(e) => setBooking((p) => ({ ...p, time: e.target.value }))}
                        required
                        disabled={!booking.doctorId || !booking.date || times.length === 0}
                      >
                        <option value="">
                          {!booking.doctorId || !booking.date
                            ? "Select provider & date first"
                            : times.length
                            ? "Select a slot"
                            : "No slots available"}
                        </option>
                        {times.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {booking.doctorId && (
                    <div className="mb-4 p-3 bg-teal-50 rounded-lg border border-teal-100 flex items-center gap-2">
                      <User className="w-4 h-4 text-teal-600" />
                      <span className="text-sm text-teal-800 font-medium">
                        Provider: {doctorById.get(booking.doctorId)?.fullName}
                        {doctorById.get(booking.doctorId)?.specialty && (
                          <span className="text-teal-600 font-normal"> — {doctorById.get(booking.doctorId).specialty}</span>
                        )}
                      </span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={bookingBusy || !booking.doctorId || !booking.date || !booking.time}
                    className="w-full py-3 rounded-lg bg-gradient-to-r from-teal-500 to-teal-600 text-white text-sm font-semibold shadow-md hover:shadow-lg hover:from-teal-600 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                  >
                    {bookingBusy ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Booking...
                      </>
                    ) : (
                      <>
                        <CalendarDays className="w-4 h-4" />
                        Confirm Priority Booking
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>

            {/* Your Bookings */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
                    <CalendarDays className="w-4 h-4 text-orange-500" />
                  </div>
                  <h3 className="font-semibold text-slate-800 text-sm">Upcoming Bookings</h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">{appointments.length}</span>
                  {appointments.length > 3 && (
                    <button
                      onClick={() => setAppointmentsVisible((v) => v === 3 ? appointments.length : 3)}
                      className="text-xs text-teal-600 font-semibold hover:text-teal-700 transition-all"
                    >
                      {appointmentsVisible === 3 ? "Show more" : "Show less"}
                    </button>
                  )}
                </div>
              </div>

              <div className="p-4">
                {loading ? (
                  <div className="space-y-3">
                    {[1, 2].map((i) => (
                      <div key={i} className="h-16 bg-slate-100 rounded-lg animate-pulse" />
                    ))}
                  </div>
                ) : appointments.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                      <CalendarDays className="w-5 h-5 text-slate-400" />
                    </div>
                    <p className="text-slate-500 text-sm">No upcoming bookings</p>
                    <p className="text-slate-400 text-xs mt-1">Request one using the form above</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {appointments.slice(0, appointmentsVisible).map((a) => (
                      <div
                        key={a._id}
                        className="p-3 rounded-xl border border-slate-100 bg-slate-50 hover:bg-teal-50 hover:border-teal-100 transition-all"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-teal-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                            {a.doctor?.fullName?.charAt(0) || "P"}
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-800 truncate">Provider: {a.doctor?.fullName}</p>
                            <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                              <span className="flex items-center gap-1">
                                <CalendarDays className="w-3 h-3" />
                                {a.date}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {a.time}
                              </span>
                              {a.doctor?.specialty && <span>{a.doctor.specialty}</span>}
                            </div>
                          </div>

                          <div className="shrink-0 flex flex-col items-end gap-1.5">
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-xs px-2 py-1 rounded-full font-medium ${
                                  a.mode === "online"
                                    ? "bg-blue-50 text-blue-600 border border-blue-200"
                                    : "bg-slate-100 text-slate-600 border border-slate-200"
                                }`}
                              >
                                {a.mode === "online" ? "📞 Remote" : "🚜 On-site"}
                              </span>

                              <span
                                className={`text-xs px-2 py-1 rounded-full font-medium border ${
                                  a.status === "pending"
                                    ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                                    : a.status === "rejected"
                                    ? "bg-red-50 text-red-700 border-red-200"
                                    : a.status === "completed"
                                    ? "bg-slate-100 text-slate-600 border-slate-200"
                                    : "bg-green-50 text-green-700 border-green-200"
                                }`}
                              >
                                {a.status === "pending"
                                  ? "⏳ Pending"
                                  : a.status === "rejected"
                                  ? "❌ Rejected"
                                  : a.status === "completed"
                                  ? "✅ Completed"
                                  : "✅ Confirmed"}
                              </span>
                            </div>

                            {a.mode === "online" && a.status !== "rejected" && a.status !== "completed" && (
                              <div>
                                {a.status === "pending" ? (
                                  <span className="text-[11px] text-slate-500">Waiting for provider acceptance</span>
                                ) : typeof a.meetLink === "string" && a.meetLink.startsWith("https://") ? (
                                  <a
                                    href={a.meetLink}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-500 text-white text-xs font-semibold hover:bg-blue-600 transition-all"
                                  >
                                    <Video className="w-3 h-3" /> Join
                                  </a>
                                ) : (
                                  <span className="text-[11px] text-slate-500">Call link not yet added</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {a.status === "completed" && (
                          <div className="mt-3 pt-3 border-t border-slate-200 flex items-center justify-between gap-3">
                            {reviewedByApptId?.[String(a._id)] ? (
                              <span className="text-xs px-2 py-1 rounded-full bg-green-50 text-green-700 border border-green-200 font-semibold">
                                Reviewed
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => toggleReview(String(a._id))}
                                className="text-xs px-3 py-1.5 rounded-full bg-teal-600 text-white font-semibold hover:bg-teal-700 transition-all"
                              >
                                {openReviewApptId === String(a._id) ? "Cancel" : "Leave Review"}
                              </button>
                            )}

                            {!reviewedByApptId?.[String(a._id)] && openReviewApptId === String(a._id) && (
                              <div className="flex-1" />
                            )}
                          </div>
                        )}

                        {!reviewedByApptId?.[String(a._id)] && a.status === "completed" && openReviewApptId === String(a._id) && (
                          <div className="mt-3 p-3 rounded-xl border border-slate-200 bg-white">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="text-xs font-semibold text-slate-800">Rate your session</p>
                                <p className="text-[11px] text-slate-500">1 (bad) to 5 (excellent)</p>
                              </div>
                              <StarRating
                                value={reviewDraftByApptId?.[String(a._id)]?.rating || 5}
                                onChange={(v) => setReviewDraftByApptId((p) => ({ ...p, [String(a._id)]: { ...(p?.[String(a._id)] || {}), rating: v } }))}
                              />
                            </div>

                            <textarea
                              rows={3}
                              value={reviewDraftByApptId?.[String(a._id)]?.comment || ""}
                              onChange={(e) => setReviewDraftByApptId((p) => ({ ...p, [String(a._id)]: { ...(p?.[String(a._id)] || {}), comment: e.target.value } }))}
                              placeholder="Optional feedback…"
                              className="mt-3 w-full px-3 py-2 rounded-lg border border-slate-300 bg-slate-50 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                            />

                            <button
                              type="button"
                              onClick={() => submitReview(String(a._id))}
                              disabled={reviewBusyApptId === String(a._id)}
                              className="mt-3 w-full py-2.5 rounded-lg bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700 disabled:opacity-50 transition-all"
                            >
                              {reviewBusyApptId === String(a._id) ? "Submitting…" : "Submit Review"}
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                    {appointmentsHasMore && (
                      <button
                        onClick={loadMoreAppointments}
                        disabled={appointmentsLoadingMore}
                        className="w-full mt-3 py-2.5 rounded-lg border border-teal-200 bg-teal-50 text-teal-700 text-xs font-semibold hover:bg-teal-100 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                      >
                        {appointmentsLoadingMore ? (
                          <>
                            <span className="w-4 h-4 border-2 border-teal-300 border-t-teal-600 rounded-full animate-spin" />
                            Loading…
                          </>
                        ) : (
                          <>
                            <ChevronRight className="w-3.5 h-3.5" />
                            Load More Bookings
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Profile Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-slate-700 to-slate-800 px-6 py-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm">
                  {authUser?.fullName?.charAt(0) || "F"}
                </div>
                <div>
                  <h3 className="text-white font-semibold text-sm">My Profile</h3>
                  <p className="text-slate-300 text-xs">{patientTypeLabel} Farmer</p>
                </div>
              </div>

              <div className="p-5 space-y-3">
                {[
                  { label: "Full Name", value: authUser?.fullName },
                  { label: "Email", value: authUser?.email },
                  { label: "Access Type", value: patientTypeLabel },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-start gap-3">
                    <span className="text-xs text-slate-500 w-20 shrink-0 mt-0.5">{label}</span>
                    <span className="text-sm text-slate-800 font-medium">{value || "—"}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Latest Report */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-teal-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800 text-sm">Latest Report</h3>
                  <p className="text-slate-500 text-xs">Most recent report</p>
                </div>
              </div>

              <div className="p-5">
                {loading ? (
                  <div className="space-y-2">
                    <div className="h-4 bg-slate-100 rounded animate-pulse w-3/4" />
                    <div className="h-3 bg-slate-100 rounded animate-pulse w-1/2" />
                  </div>
                ) : !latestReport ? (
                  <div className="text-center py-4">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-2">
                      <FileText className="w-4 h-4 text-slate-400" />
                    </div>
                    <p className="text-slate-500 text-xs">No reports yet</p>
                  </div>
                ) : (
                  <div>
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 mb-3">
                      <p className="text-sm font-bold text-slate-800">{latestReport.title}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {new Date(latestReport.createdAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                      {latestReport.doctor?.fullName && (
                        <p className="text-xs text-teal-600 mt-0.5">Provider: {latestReport.doctor.fullName}</p>
                      )}
                      {latestReport.notes && (
                        <p
                          className="text-xs text-slate-600 mt-2 line-clamp-2"
                          style={{ whiteSpace: "pre-wrap" }}
                        >
                          {latestReport.notes}
                        </p>
                      )}
                    </div>

                    {(latestReport.fileUrl || latestReport.filePublicId) && latestReport._id && (
                      <a
                        href={`${apiBase}/patient-dashboard/reports/${latestReport._id}/download`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-teal-50 text-teal-700 text-xs font-semibold border border-teal-200 hover:bg-teal-100 transition-all"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download PDF
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* All Reports */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
                    <Activity className="w-4 h-4 text-orange-600" />
                  </div>
                  <h3 className="font-semibold text-slate-800 text-sm">Farm Reports</h3>
                </div>
                <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">{reports.length}</span>
              </div>

              <div className="p-4">
                {loading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-12 bg-slate-100 rounded animate-pulse" />
                    ))}
                  </div>
                ) : reports.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-slate-500 text-xs">No reports available</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {reports.slice(0, 5).map((r) => (
                      <div
                        key={r._id}
                        className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-100 bg-slate-50 hover:bg-teal-50 hover:border-teal-100 transition-all group"
                      >
                        <div className="w-7 h-7 rounded-md bg-teal-100 flex items-center justify-center shrink-0">
                          <FileText className="w-3.5 h-3.5 text-teal-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-800 truncate">{r.title}</p>
                          <p className="text-xs text-slate-500">{new Date(r.createdAt).toLocaleDateString()}</p>
                        </div>

                        {r.fileUrl || r.filePublicId ? (
                          <a
                            href={`${apiBase}/patient-dashboard/reports/${r._id}/download`}
                            target="_blank"
                            rel="noreferrer"
                            className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                            aria-label="Download report"
                          >
                            <Download className="w-3 h-3 text-slate-600" />
                          </a>
                        ) : null}
                      </div>
                    ))}

                    {reports.length > 5 && (
                      <p className="text-center text-xs text-slate-500 pt-1">+ {reports.length - 5} more reports</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Farm Insights — only shown when farmer has more than 2 reports */}
            {reports.length > 2 && (
              <FarmInsightsCard reports={reports} appointments={appointments} latestReport={latestReport} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

const FarmInsightsCard = ({ reports, appointments, latestReport }) => {
  const score = calculateFarmScore({ reports, appointments });
  const dos = getFarmDos({ reports, appointments });
  const donts = getFarmDonts({ reports });
  const meds = getInputRecommendations({ reports });
  const summary = getReportSummary({ latestReport });

  const scoreColor = score < 40 ? "#ef4444" : score < 70 ? "#f59e0b" : "#22c55e";
  const scoreLabel = score < 40 ? "Needs Attention" : score < 70 ? "Fair" : "Good";

  const radius = 38;
  const circ = 2 * Math.PI * radius;
  const pct = (score / 100) * circ;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center">
          <TrendingUp className="w-4 h-4 text-teal-600" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-800 text-sm">Farm Insights</h3>
          <p className="text-slate-500 text-xs">Insights & recommendations</p>
        </div>
      </div>
      <div className="p-5 space-y-5">
        {/* Score Gauge */}
        <div className="flex flex-col items-center">
          <div className="relative w-24 h-24">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 88 88">
              <circle cx="44" cy="44" r={radius} fill="none" stroke="#f1f5f9" strokeWidth="8" />
              <circle
                cx="44" cy="44" r={radius} fill="none"
                stroke={scoreColor} strokeWidth="8"
                strokeDasharray={circ}
                strokeDashoffset={circ - pct}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-bold" style={{ color: scoreColor }}>{score}</span>
              <span className="text-xs text-slate-500 font-medium">{scoreLabel}</span>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-1">Your Farm Score</p>
        </div>

        {/* Do's */}
        {dos.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> Recommended
            </p>
            <ul className="space-y-1.5">
              {dos.map((d, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-slate-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-1.5 shrink-0" />
                  {d}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Don'ts */}
        {donts.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <XCircle className="w-3.5 h-3.5 text-red-400" /> Avoid
            </p>
            <ul className="space-y-1.5">
              {donts.map((d, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-slate-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
                  {d}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Suggested Inputs */}
        {meds.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <Pill className="w-3.5 h-3.5 text-blue-400" /> Suggested Inputs
            </p>
            <ul className="space-y-1.5">
              {meds.map((m, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-slate-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                  {m}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Report Summary */}
        <div>
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-slate-400" /> Report Summary
          </p>
          <p className="text-xs text-slate-600 leading-relaxed" style={{ whiteSpace: "pre-wrap" }}>{summary}</p>
        </div>
      </div>
    </div>
  );
};

export default FarmerPlusDashboard;
