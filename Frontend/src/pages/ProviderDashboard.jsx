import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { axiosInstance } from "../lib/axios";
import { analyzeFarmerForProvider } from "../lib/farmInsights";
import {
  CalendarDays, ChevronLeft, ChevronRight, ToggleLeft, ToggleRight,
  LogOut, Activity, TrendingUp, AlertTriangle, Stethoscope,
  FileSearch, Clock, CheckCircle2, XCircle, Video, RefreshCw,
  UserCircle, FileText, ArrowRight, X
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuthStore } from "../store/useAuthStore";

const toYMD = (d) => {
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().split("T")[0];
};

const getMonthDays42 = (cursor) => {
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const dayOffset = (firstOfMonth.getDay() + 6) % 7;
  const start = new Date(firstOfMonth);
  start.setDate(firstOfMonth.getDate() - dayOffset);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
};

const isSafeHttpUrl = (url) => typeof url === "string" && url.startsWith("https://");

const ProviderDashboard = () => {
  const { authUser, logout } = useAuthStore();
  const navigate = useNavigate();

  const [isAvailable, setIsAvailable] = useState(Boolean(authUser?.isAvailable));
  const [current, setCurrent] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(() => toYMD(new Date()));
  const [panelOpen, setPanelOpen] = useState(false);
  const [actionBusy, setActionBusy] = useState("");
  const [meetDraftById, setMeetDraftById] = useState({});

  const apiBase = useMemo(() => (axiosInstance.defaults.baseURL || "").replace(/\/$/, ""), []);
  const [patientSearch, setPatientSearch] = useState("");
  const [patients, setPatients] = useState([]);
  const [patientsLoading, setPatientsLoading] = useState(true);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [patientReports, setPatientReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(false);

  const onLogout = async () => { await logout(); navigate("/"); };

  const onAccessibility = () => {
    navigate("/accessibility");
  };

  useEffect(() => { setIsAvailable(Boolean(authUser?.isAvailable)); }, [authUser?.isAvailable]);

  const load = async () => {
    setLoading(true);
    try {
      const [curRes, listRes] = await Promise.all([
        axiosInstance.get("/doctor/appointments/current"),
        axiosInstance.get("/doctor/appointments"),
      ]);
      setCurrent(curRes.data);
      setAppointments(Array.isArray(listRes.data) ? listRes.data : []);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to load schedule");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const loadPatients = useCallback(async () => {
    setPatientsLoading(true);
    try {
      const res = await axiosInstance.get("/doctor/patients", { params: patientSearch.trim() ? { search: patientSearch } : {} });
      setPatients(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to load patients");
      setPatients([]);
    } finally {
      setPatientsLoading(false);
    }
  }, [patientSearch]);

  const loadReportsForPatient = useCallback(async (patientId) => {
    if (!patientId) { setPatientReports([]); return; }
    setReportsLoading(true);
    try {
      const res = await axiosInstance.get(`/doctor/patients/${patientId}/reports`);
      setPatientReports(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to load reports");
      setPatientReports([]);
    } finally {
      setReportsLoading(false);
    }
  }, []);

  useEffect(() => { loadPatients(); }, [loadPatients]);
  useEffect(() => { loadReportsForPatient(selectedPatientId); }, [selectedPatientId, loadReportsForPatient]);

  const onToggle = async () => {
    const next = !isAvailable;
    setSaving(true);
    try {
      const res = await axiosInstance.patch("/doctor/availability", { isAvailable: next });
      setIsAvailable(res.data.isAvailable);
      toast.success(res.data.isAvailable ? "Marked available" : "Marked unavailable");
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to update availability");
    } finally {
      setSaving(false);
    }
  };

  const monthLabel = useMemo(() => {
    const d = new Date(cursor);
    return d.toLocaleString(undefined, { month: "long", year: "numeric" });
  }, [cursor]);

  const days = useMemo(() => getMonthDays42(cursor), [cursor]);
  const cursorMonth = cursor.getMonth();
  const todayYmd = useMemo(() => toYMD(new Date()), []);

  const apptsByDate = useMemo(() => {
    const map = new Map();
    for (const a of appointments) {
      if (!a?.date) continue;
      const key = toYMD(a.date);
      if (!key) continue;
      const list = map.get(key) || [];
      list.push(a);
      map.set(key, list);
    }
    return map;
  }, [appointments]);

  const selectedDaySlots = useMemo(() => {
    const slots = Array.isArray(authUser?.slots) ? authUser.slots : [];
    const day = slots.find((s) => toYMD(s?.date) === selectedDate);
    const times = Array.isArray(day?.times) ? day.times.slice() : [];
    times.sort();
    return times;
  }, [authUser?.slots, selectedDate]);

  const selectedDayAppts = useMemo(() => {
    const list = apptsByDate.get(selectedDate) || [];
    return list.slice().sort((a, b) => String(a.time).localeCompare(String(b.time)));
  }, [apptsByDate, selectedDate]);

  const selectedDayTimes = useMemo(() => {
    const set = new Set();
    for (const t of selectedDaySlots) {
      if (t) set.add(String(t));
    }
    for (const a of selectedDayAppts) {
      if (a?.time) set.add(String(a.time));
    }
    return Array.from(set).sort((a, b) => String(a).localeCompare(String(b)));
  }, [selectedDaySlots, selectedDayAppts]);

  const apptByTime = useMemo(() => {
    const m = new Map();
    for (const a of selectedDayAppts) { if (a?.time) m.set(a.time, a); }
    return m;
  }, [selectedDayAppts]);

  const onSelectDate = (ymd) => { setSelectedDate(ymd); setPanelOpen(true); };
  const prevMonth = () => setCursor((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () => setCursor((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  const decideOnline = async (appointmentId, decision) => {
    setActionBusy(appointmentId);
    try {
      await axiosInstance.patch(`/doctor/appointments/${appointmentId}/decision`, { decision });
      toast.success(decision === "accept" ? "Booking accepted" : "Booking rejected");
      await load();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to update booking");
    } finally {
      setActionBusy("");
    }
  };

  const uploadMeetLink = async (appointmentId) => {
    const meetLink = String(meetDraftById?.[appointmentId] || "").trim();
    if (!isSafeHttpUrl(meetLink)) {
      toast.error("Please paste a valid https call link");
      return;
    }

    setActionBusy(appointmentId);
    try {
      await axiosInstance.patch(`/doctor/appointments/${appointmentId}/meet-link`, { meetLink });
      toast.success("Call link saved");
      setMeetDraftById((p) => {
        const next = { ...p };
        delete next[appointmentId];
        return next;
      });
      await load();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to save call link");
    } finally {
      setActionBusy("");
    }
  };

  const markCompleted = async (appointmentId) => {
    setActionBusy(appointmentId);
    try {
      await axiosInstance.patch(`/doctor/appointments/${appointmentId}/complete`);
      toast.success("Service marked completed");
      await load();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to mark completed");
    } finally {
      setActionBusy("");
    }
  };

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return "Good Morning";
    if (h < 17) return "Good Afternoon";
    return "Good Evening";
  }, []);

  const upcomingCount = apptsByDate.size;
  const todayAppts = apptsByDate.get(todayYmd)?.length || 0;

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
              <p className="text-xs text-slate-500">Provider Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              Provider
            </span>
            <div className="w-9 h-9 rounded-full bg-teal-600 flex items-center justify-center text-white font-semibold text-sm">
              {authUser?.fullName?.charAt(0) || "P"}
            </div>
            <button
              onClick={onAccessibility}
              className="px-3 py-1.5 rounded-full border border-slate-300 text-slate-600 text-xs font-medium hover:bg-slate-50 transition-all"
            >
              Accessibility
            </button>
            <button onClick={onLogout} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-300 text-slate-600 text-xs font-medium hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-all">
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
          <div className="relative z-10 flex items-start justify-between">
            <div>
              <p className="text-teal-100 text-sm font-medium mb-1">{greeting}</p>
              <h2 className="text-2xl font-bold text-white mb-1">Provider: {authUser?.fullName}</h2>
              <p className="text-teal-100 text-sm">{authUser?.specialty || "Specialist"}</p>
            </div>
            <div className="hidden md:flex items-center gap-6 text-teal-100 text-sm">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{appointments.length}</div>
                <div className="text-teal-200 text-xs">Total Bookings</div>
              </div>
              <div className="w-px h-10 bg-teal-300 opacity-30" />
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{todayAppts}</div>
                <div className="text-teal-200 text-xs">Today</div>
              </div>
              <div className="w-px h-10 bg-teal-300 opacity-30" />
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{upcomingCount}</div>
                <div className="text-teal-200 text-xs">Active Days</div>
              </div>
            </div>
          </div>
        </div>

        {/* Top Controls */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Your Dashboard</h2>
            <p className="text-sm text-slate-500">Manage your schedule and farmer bookings</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={load} disabled={loading} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-600 text-sm font-medium hover:bg-slate-50 transition-all shadow-sm">
              <RefreshCw size={14} /> Refresh
            </button>
            <button onClick={onToggle} disabled={saving} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-md ${isAvailable ? "bg-green-500 text-white hover:bg-green-600" : "bg-slate-200 text-slate-600 hover:bg-slate-300"}`}>
              {isAvailable ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
              {isAvailable ? "Available" : "Unavailable"}
            </button>
          </div>
        </div>

        {/* Current Appointment + Calendar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Current/Next Appointment */}
          <div className="lg:col-span-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center">
                <Activity className="w-4 h-4 text-teal-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800 text-sm">Current / Next</h3>
                {current?.date && <p className="text-xs text-slate-500">{current.date} at {current.time}</p>}
              </div>
            </div>
            <div className="p-5">
              {loading ? (
                <div className="space-y-2"><div className="h-20 bg-slate-100 rounded-xl animate-pulse" /><div className="h-12 bg-slate-100 rounded-xl animate-pulse" /></div>
              ) : !current ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                    <CalendarDays className="w-5 h-5 text-slate-400" />
                  </div>
                  <p className="text-slate-500 text-sm">No upcoming bookings</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 rounded-xl border border-teal-100 bg-teal-50">
                    <div className="w-10 h-10 rounded-full bg-teal-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {current.patient?.fullName?.charAt(0) || "P"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800">{current.patient?.fullName}</p>
                      <p className="text-xs text-slate-500">{current.patient?.email}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${current.mode === "online" ? "bg-blue-50 text-blue-600 border border-blue-200" : "bg-slate-100 text-slate-600 border border-slate-200"}`}>
                          {current.mode === "online" ? "Remote" : "On-site"}
                        </span>
                      </div>
                    </div>
                  </div>
                  {current.mode === "online" && isSafeHttpUrl(current.meetLink) && (
                    <a href={current.meetLink} target="_blank" rel="noreferrer"
                      className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-blue-500 text-white text-sm font-semibold hover:bg-blue-600 transition-all">
                      <Video className="w-4 h-4" /> Join Call
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Calendar */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                  <CalendarDays className="w-4 h-4 text-blue-600" />
                </div>
                <h3 className="font-semibold text-slate-800 text-sm">Schedule</h3>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={prevMonth} className="w-8 h-8 rounded-lg border border-slate-300 flex items-center justify-center hover:bg-slate-50 transition-all">
                  <ChevronLeft size={16} className="text-slate-600" />
                </button>
                <span className="text-sm font-bold text-slate-700 min-w-[140px] text-center">{monthLabel}</span>
                <button onClick={nextMonth} className="w-8 h-8 rounded-lg border border-slate-300 flex items-center justify-center hover:bg-slate-50 transition-all">
                  <ChevronRight size={16} className="text-slate-600" />
                </button>
              </div>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-7 gap-1 mb-1">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((w) => (
                  <div key={w} className="text-center text-xs font-bold text-slate-500 py-1">{w}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {days.map((d) => {
                  const ymd = toYMD(d);
                  const inMonth = d.getMonth() === cursorMonth;
                  const isToday = ymd === todayYmd;
                  const isSelected = ymd === selectedDate;
                  const count = (apptsByDate.get(ymd) || []).length;
                  return (
                    <button
                      key={ymd}
                      onClick={() => onSelectDate(ymd)}
                      className="relative p-2 rounded-lg border text-left transition-all"
                      style={{
                        borderColor: isSelected ? "#0d9488" : isToday ? "#60a5fa" : count > 0 ? "#22c55e" : "#e5e7eb",
                        background: isSelected ? "rgba(13,148,136,0.08)" : isToday ? "rgba(96,165,250,0.08)" : "white",
                        opacity: inMonth ? 1 : 0.35,
                        height: 56,
                      }}
                    >
                      <span className={`text-sm font-bold ${isToday ? "text-blue-600" : "text-slate-700"}`}>{d.getDate()}</span>
                      {count > 0 && (
                        <span className="absolute bottom-1.5 right-1.5 text-xs bg-green-500 text-white rounded-full w-4 h-4 flex items-center justify-center" style={{ fontSize: "0.6rem" }}>
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-slate-500 mt-3 text-center">Click a date to view slots and bookings</p>
            </div>
          </div>
        </div>

        {/* Side Panel Overlay */}
        {panelOpen && (
          <div role="presentation" onClick={() => setPanelOpen(false)}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 50 }}>
            <div role="presentation" onClick={(e) => e.stopPropagation()}
              style={{ position: "absolute", top: 0, right: 0, height: "100%", width: "min(520px, 95vw)", background: "white", borderLeft: "1px solid #e2e8f0", padding: 20, overflow: "auto" }}>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-xs text-slate-500">Selected Date</p>
                  <p className="text-lg font-bold text-slate-800">{selectedDate}</p>
                </div>
                <button onClick={() => setPanelOpen(false)} className="w-8 h-8 rounded-full border border-slate-300 flex items-center justify-center hover:bg-slate-50">
                  <X size={16} className="text-slate-600" />
                </button>
              </div>

              {selectedDayTimes.length === 0 && selectedDayAppts.length === 0 ? (
                <div className="text-center py-12">
                  <CalendarDays className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-500 text-sm">No slots or bookings for this day</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedDayTimes.map((t) => {
                    const a = apptByTime.get(t);
                    const isPending = a?.status === "pending";
                    const isRejected = a?.status === "rejected";
                    const isBooked = a?.status === "booked";
                    const isCompleted = a?.status === "completed";
                    const isOnline = a?.mode === "online";
                    const canDecide = Boolean(a && isOnline && isPending);
                    const canUploadMeet = Boolean(a && isOnline && isBooked && !isSafeHttpUrl(a.meetLink));
                    const canComplete = Boolean(a && isBooked);
                    return (
                      <div key={t} className="p-4 rounded-xl border bg-white border-slate-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-bold text-slate-700">{t}</span>
                          {!a ? (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200 font-medium">Available</span>
                          ) : isPending ? (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-700 border border-yellow-200 font-medium">Pending</span>
                          ) : isRejected ? (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 font-medium">Rejected</span>
                          ) : isCompleted ? (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-medium">Completed</span>
                          ) : (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200 font-medium">Booked</span>
                          )}
                        </div>
                        {a && (
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-teal-600 flex items-center justify-center text-white text-xs font-bold">
                                {a.patient?.fullName?.charAt(0) || "P"}
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-slate-800">{a.patient?.fullName}</p>
                                <p className="text-xs text-slate-500">{a.patient?.patientType}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs px-2 py-0.5 rounded-full ${a.mode === "online" ? "bg-blue-50 text-blue-600 border border-blue-200" : "bg-slate-100 text-slate-600 border border-slate-200"}`}>
                                {a.mode === "online" ? "Remote" : "On-site"}
                              </span>
                              {a.mode === "online" && isSafeHttpUrl(a.meetLink) && (
                                <a href={a.meetLink} target="_blank" rel="noreferrer" className="text-xs text-blue-600 font-medium flex items-center gap-1">
                                  <Video className="w-3 h-3" /> Join Call
                                </a>
                              )}
                            </div>

                            {canDecide && (
                              <div className="pt-2 flex items-center gap-2">
                                <button
                                  onClick={() => decideOnline(a._id, "accept")}
                                  disabled={actionBusy === a._id}
                                  className="flex-1 py-2 rounded-lg bg-green-500 text-white text-xs font-semibold hover:bg-green-600 disabled:opacity-50 transition-all flex items-center justify-center gap-1"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Accept
                                </button>
                                <button
                                  onClick={() => decideOnline(a._id, "reject")}
                                  disabled={actionBusy === a._id}
                                  className="flex-1 py-2 rounded-lg bg-red-500 text-white text-xs font-semibold hover:bg-red-600 disabled:opacity-50 transition-all flex items-center justify-center gap-1"
                                >
                                  <XCircle className="w-3.5 h-3.5" /> Reject
                                </button>
                              </div>
                            )}

                            {canUploadMeet && (
                              <div className="pt-2 space-y-2">
                                <p className="text-xs text-slate-500">Call link not added yet</p>
                                <input
                                  value={meetDraftById?.[a._id] || ""}
                                  onChange={(e) => setMeetDraftById((p) => ({ ...p, [a._id]: e.target.value }))}
                                  placeholder="Paste call link (https://...)"
                                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-slate-50 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                />
                                <button
                                  onClick={() => uploadMeetLink(a._id)}
                                  disabled={actionBusy === a._id}
                                  className="w-full py-2.5 rounded-lg bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700 disabled:opacity-50 transition-all"
                                >
                                  Save Call Link
                                </button>
                              </div>
                            )}

                            {canComplete && (
                              <div className="pt-2">
                                <button
                                  onClick={() => markCompleted(a._id)}
                                  disabled={actionBusy === a._id}
                                  className="w-full py-2.5 rounded-lg bg-slate-800 text-white text-xs font-semibold hover:bg-slate-900 disabled:opacity-50 transition-all"
                                >
                                  Service Completed
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Farmer Insights */}
        {selectedPatientId && (
          <FarmerInsightsPanel
            reports={patientReports}
            patient={patients.find((p) => p._id === selectedPatientId)}
          />
        )}

        {/* Farmer Search + Reports */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center">
              <FileText className="w-4 h-4 text-teal-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 text-sm">Farmer Reports</h3>
              <p className="text-xs text-slate-500">View farmer history and download reports</p>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Search + Select */}
              <div className="space-y-4">
                <div className="flex gap-2">
                  <input
                    className="flex-1 px-3 py-2.5 rounded-lg border border-slate-300 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                    placeholder="Search farmer name or email"
                    value={patientSearch}
                    onChange={(e) => setPatientSearch(e.target.value)}
                  />
                  <button onClick={loadPatients} disabled={patientsLoading}
                    className="px-4 py-2.5 rounded-lg border border-slate-300 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-all disabled:opacity-50">
                    {patientsLoading ? "..." : <RefreshCw size={14} />}
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Select Farmer</label>
                  <select
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                    value={selectedPatientId}
                    onChange={(e) => setSelectedPatientId(e.target.value)}
                  >
                    <option value="">Choose a farmer</option>
                    {patients.map((p) => (<option key={p._id} value={p._id}>{p.fullName} {p.email ? `(${p.email})` : ""}</option>))}
                  </select>
                  <p className="text-xs text-slate-500 mt-1.5">Only farmers with your bookings will appear</p>
                </div>

                {selectedPatientId && (
                  <div className="p-4 rounded-xl bg-teal-50 border border-teal-100">
                    <p className="text-xs text-teal-600 font-semibold mb-1">Selected Farmer</p>
                    <p className="text-sm font-bold text-slate-800">{patients.find((p) => p._id === selectedPatientId)?.fullName}</p>
                    <p className="text-xs text-slate-500">{patients.find((p) => p._id === selectedPatientId)?.email}</p>
                  </div>
                )}
              </div>

              {/* Reports */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-slate-700">Reports</h4>
                  {selectedPatientId && (
                    <button onClick={() => loadReportsForPatient(selectedPatientId)} disabled={reportsLoading}
                      className="text-xs text-teal-600 font-medium hover:underline disabled:opacity-50">
                      {reportsLoading ? "Loading..." : "Refresh"}
                    </button>
                  )}
                </div>

                {!selectedPatientId ? (
                  <div className="text-center py-12 rounded-xl border-2 border-dashed border-slate-200">
                    <UserCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-slate-500 text-sm">Select a farmer to view their reports</p>
                  </div>
                ) : reportsLoading ? (
                  <div className="space-y-2">{[1, 2, 3].map((i) => (<div key={i} className="h-16 bg-slate-100 rounded-lg animate-pulse" />))}</div>
                ) : patientReports.length === 0 ? (
                  <div className="text-center py-12 rounded-xl border-2 border-dashed border-slate-200">
                    <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-slate-500 text-sm">No reports for this farmer yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {patientReports.map((r) => (
                      <div key={r._id} className="flex items-start gap-3 p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-teal-50 hover:border-teal-100 transition-all">
                        <div className="w-9 h-9 rounded-md bg-teal-100 flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4 text-teal-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800">{r.title}</p>
                          <p className="text-xs text-slate-500">{new Date(r.createdAt).toLocaleDateString()}</p>
                          {r.doctor?.fullName && <p className="text-xs text-teal-600 mt-0.5">Provider: {r.doctor.fullName}</p>}
                          {r.notes && <p className="text-xs text-slate-600 mt-1 line-clamp-2" style={{ whiteSpace: "pre-wrap" }}>{r.notes}</p>}
                        </div>
                        {(r.fileUrl || r.filePublicId) && (
                          <a href={`${apiBase}/doctor/reports/${r._id}/download`} target="_blank" rel="noreferrer"
                            className="w-8 h-8 rounded-full bg-teal-50 flex items-center justify-center border border-teal-200 hover:bg-teal-100 transition-all shrink-0">
                            <ArrowRight className="w-3.5 h-3.5 text-teal-600" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

const FarmerInsightsPanel = ({ reports, patient }) => {
  const analysis = analyzeFarmerForProvider({ reports });

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-8">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center">
          <FileSearch className="w-4 h-4 text-teal-600" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-800 text-sm">Farmer Insights</h3>
          <p className="text-xs text-slate-500">{patient?.fullName} — {patient?.email || "No email"}</p>
        </div>
      </div>
      <div className="p-6">
        {analysis.reportCount === 0 ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
              <FileSearch className="w-5 h-5 text-slate-400" />
            </div>
            <p className="text-slate-500 text-sm">No reports on file for this farmer.</p>
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                { label: "Reports", value: analysis.reportCount, icon: <FileText className="w-4 h-4" />, color: "text-teal-600", bg: "bg-teal-50" },
                { label: "First Report", value: formatDate(analysis.firstReportDate), icon: <CalendarDays className="w-4 h-4" />, color: "text-blue-600", bg: "bg-blue-50" },
                { label: "Last Report", value: formatDate(analysis.lastReportDate), icon: <Clock className="w-4 h-4" />, color: "text-orange-600", bg: "bg-orange-50" },
                { label: "Days Since", value: analysis.daysSinceLastReport != null ? `${analysis.daysSinceLastReport}d` : "—", icon: <TrendingUp className="w-4 h-4" />, color: "text-purple-600", bg: "bg-purple-50" },
              ].map(({ label, value, icon, color, bg }) => (
                <div key={label} className={`p-4 rounded-xl ${bg}`}>
                  <div className={`flex items-center gap-2 mb-2 ${color}`}>{icon}<span className="text-xs font-semibold uppercase">{label}</span></div>
                  <div className={`text-lg font-bold ${color}`}>{value}</div>
                </div>
              ))}
            </div>

            {/* Insight + Action Items + Possible Issues */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Insight */}
              <div className="p-4 rounded-xl bg-teal-50 border border-teal-100 md:col-span-2">
                <div className="flex items-center gap-2 mb-3">
                  <Stethoscope className="w-4 h-4 text-teal-600" />
                  <span className="text-sm font-bold text-slate-800">Insight Summary</span>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed" style={{ whiteSpace: "pre-wrap" }}>{analysis.insightText}</p>
              </div>

              {/* Lacking */}
              <div className="p-4 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                  <span className="text-sm font-bold text-slate-800">Action Items</span>
                </div>
                {(analysis.actionItems || analysis.lacking || []).length === 0 ? (
                  <p className="text-sm text-slate-400">No gaps identified.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {(analysis.actionItems || analysis.lacking || []).map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                        <XCircle className="w-3.5 h-3.5 text-orange-400 mt-0.5 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Possible Issues */}
              <div className="p-4 rounded-xl border border-slate-200 md:col-span-3">
                <div className="flex items-center gap-2 mb-3">
                  <Stethoscope className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-bold text-slate-800">Possible Issues</span>
                </div>
                {(analysis.possibleIssues || analysis.possibleDiagnoses || []).length === 0 ? (
                  <p className="text-sm text-slate-400">No specific condition indicators found in reports.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {(analysis.possibleIssues || analysis.possibleDiagnoses || []).map((dx, i) => (
                      <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200">
                        <CheckCircle2 size={12} />{dx}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ProviderDashboard;
