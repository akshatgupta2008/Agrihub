import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { axiosInstance } from "../lib/axios";
import { Trash2, PlusCircle, CalendarDays, RefreshCw, LogOut, Activity, Users, UserCircle, FileText, Clock, Video, X, CheckCircle2, MessageSquareText } from "lucide-react";
import toast from "react-hot-toast";
import { useAuthStore } from "../store/useAuthStore";
import { StarRating } from "../components/StarRating";

const AdminDashboard = () => {
  const { authUser, logout } = useAuthStore();
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [slotSaving, setSlotSaving] = useState(null);

  const [newDoctor, setNewDoctor] = useState({
    fullName: "", email: "", password: "", specialty: "", licenseNumber: "",
  });

  const [slotForm, setSlotForm] = useState({
    doctorId: "", date: "", timesCsv: "",
  });

  const [historyDoctorId, setHistoryDoctorId] = useState("");
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const [openReviewsDoctorId, setOpenReviewsDoctorId] = useState("");
  const [reviewsByDoctorId, setReviewsByDoctorId] = useState({});
  const [reviewsLoadingDoctorId, setReviewsLoadingDoctorId] = useState("");

  const apiBase = useMemo(() => (axiosInstance.defaults.baseURL || "").replace(/\/$/, ""), []);

  const [patientSearch, setPatientSearch] = useState("");
  const [patients, setPatients] = useState([]);
  const [patientsLoading, setPatientsLoading] = useState(true);
  const [selectedPatientId, setSelectedPatientId] = useState("");

  const [patientReports, setPatientReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(false);

  const [reportForm, setReportForm] = useState({ title: "", notes: "", file: null });
  const fileRef = useRef(null);
  const [uploadingReport, setUploadingReport] = useState(false);

  const loadDoctors = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get("/admin/doctors");
      setDoctors(res.data);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to load providers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadDoctors(); }, []);

  const loadDoctorReviews = async (doctorId) => {
    if (!doctorId) return;
    setReviewsLoadingDoctorId(doctorId);
    try {
      const res = await axiosInstance.get(`/admin/doctors/${doctorId}/reviews`);
      setReviewsByDoctorId((prev) => ({ ...prev, [doctorId]: res.data }));
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to load reviews");
    } finally {
      setReviewsLoadingDoctorId("");
    }
  };

  const toggleReviews = async (doctorId) => {
    if (!doctorId) return;
    if (openReviewsDoctorId === doctorId) {
      setOpenReviewsDoctorId("");
      return;
    }

    setOpenReviewsDoctorId(doctorId);
    if (!reviewsByDoctorId[doctorId]) {
      await loadDoctorReviews(doctorId);
    }
  };

  const onCreateDoctor = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await axiosInstance.post("/admin/doctors", newDoctor);
      toast.success("Provider added successfully");
      setNewDoctor({ fullName: "", email: "", password: "", specialty: "", licenseNumber: "" });
      setDoctors((prev) => [res.data, ...prev]);
      await loadDoctors();
    } catch (e2) {
      toast.error(e2?.response?.data?.message || "Failed to add provider");
    } finally {
      setCreating(false);
    }
  };

  const onDeleteDoctor = async (doctorId) => {
    if (!confirm("Delete this provider? Existing bookings will be cancelled.")) return;
    try {
      await axiosInstance.delete(`/admin/doctors/${doctorId}`);
      toast.success("Provider deleted");
      setDoctors((prev) => prev.filter((d) => d._id !== doctorId));
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to delete provider");
    }
  };

  const onSaveSlots = async (e) => {
    e.preventDefault();
    const { doctorId, date, timesCsv } = slotForm;
    if (!doctorId || !date || !timesCsv.trim()) { toast.error("Select provider, date, and times"); return; }

    const times = timesCsv.split(",").map((t) => t.trim()).filter(Boolean);
    const time24hRe = /^([01]\d|2[0-3]):[0-5]\d$/;
    const invalidTimes = times.filter((t) => !time24hRe.test(t));
    if (invalidTimes.length > 0) {
      toast.error(`Invalid: ${invalidTimes.join(", ")}. Use 24h HH:MM (e.g., 09:30).`);
      return;
    }

    const cleanedTimes = [...new Set(times)];
    setSlotSaving(doctorId);
    try {
      await axiosInstance.put(`/admin/doctors/${doctorId}/slots`, { date, times: cleanedTimes });
      toast.success("Slots updated");
      setSlotForm({ doctorId: "", date: "", timesCsv: "" });
      await loadDoctors();
    } catch (e2) {
      toast.error(e2?.response?.data?.message || "Failed to update slots");
    } finally {
      setSlotSaving(null);
    }
  };

  const doctorOptions = useMemo(
    () => doctors.map((d) => ({ id: d._id, label: `${d.fullName}${d.specialty ? ` (${d.specialty})` : ""}` })),
    [doctors]
  );

  const loadHistory = async (doctorId) => {
    setHistoryLoading(true);
    try {
      const res = await axiosInstance.get("/admin/appointments", { params: doctorId ? { doctorId } : {} });
      setHistory(res.data);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to load booking history");
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => { loadHistory(""); }, []);

  const loadPatients = useCallback(async () => {
    setPatientsLoading(true);
    try {
      const res = await axiosInstance.get("/admin/patients", { params: patientSearch.trim() ? { search: patientSearch } : {} });
      setPatients(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to load farmers");
      setPatients([]);
    } finally {
      setPatientsLoading(false);
    }
  }, [patientSearch]);

  const loadReportsForPatient = useCallback(async (patientId) => {
    if (!patientId) { setPatientReports([]); return; }
    setReportsLoading(true);
    try {
      const res = await axiosInstance.get(`/admin/patients/${patientId}/reports`);
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

  const onUploadReport = async (e) => {
    e.preventDefault();
    if (!selectedPatientId) { toast.error("Select a farmer"); return; }
    if (!reportForm.title.trim()) { toast.error("Enter a report title"); return; }
    if (!reportForm.file) { toast.error("Select a PDF file"); return; }

    const isPdf = reportForm.file.type === "application/pdf" || reportForm.file.name?.toLowerCase().endsWith(".pdf");
    if (!isPdf) { toast.error("Only PDF files are allowed"); return; }

    setUploadingReport(true);
    try {
      const fd = new FormData();
      fd.append("patientId", selectedPatientId);
      fd.append("title", reportForm.title.trim());
      if (reportForm.notes.trim()) fd.append("notes", reportForm.notes.trim());
      fd.append("file", reportForm.file);

      await axiosInstance.post("/admin/reports/upload", fd);
      toast.success("Report uploaded");
      setReportForm({ title: "", notes: "", file: null });
      if (fileRef.current) fileRef.current.value = "";
      await loadReportsForPatient(selectedPatientId);
    } catch (e2) {
      toast.error(e2?.response?.data?.message || "Upload failed");
    } finally {
      setUploadingReport(false);
    }
  };

  const onLogout = async () => { await logout(); navigate("/"); };

  const onAccessibility = () => {
    navigate("/accessibility");
  };

  const totalBooked = doctors.reduce((sum, d) => sum + (d.stats?.booked ?? 0), 0);
  const totalAppointments = doctors.reduce((sum, d) => sum + (d.stats?.total ?? 0), 0);
  const availableDoctors = doctors.filter((d) => d.isAvailable).length;

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return "Good Morning";
    if (h < 17) return "Good Afternoon";
    return "Good Evening";
  }, []);

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
              <p className="text-xs text-slate-500">Admin Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
              Admin
            </span>
            <div className="w-9 h-9 rounded-full bg-teal-600 flex items-center justify-center text-white font-semibold text-sm">
              {authUser?.fullName?.charAt(0) || "A"}
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
              <h2 className="text-2xl font-bold text-white mb-1">{authUser?.fullName}</h2>
              <p className="text-teal-100 text-sm">{authUser?.email}</p>
            </div>
            <div className="hidden md:flex items-center gap-6 text-teal-100 text-sm">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{doctors.length}</div>
                <div className="text-teal-200 text-xs">Providers</div>
              </div>
              <div className="w-px h-10 bg-teal-300 opacity-30" />
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{availableDoctors}</div>
                <div className="text-teal-200 text-xs">Available</div>
              </div>
              <div className="w-px h-10 bg-teal-300 opacity-30" />
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{totalBooked}</div>
                <div className="text-teal-200 text-xs">Booked</div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Providers", value: doctors.length, icon: <Users className="w-5 h-5" />, color: "from-teal-500 to-teal-600", bg: "bg-teal-50", text: "text-teal-600" },
            { label: "Available", value: availableDoctors, icon: <CheckCircle2 className="w-5 h-5" />, color: "from-green-500 to-green-600", bg: "bg-green-50", text: "text-green-600" },
            { label: "Total Bookings", value: totalAppointments, icon: <CalendarDays className="w-5 h-5" />, color: "from-blue-500 to-blue-600", bg: "bg-blue-50", text: "text-blue-600" },
            { label: "Booked Slots", value: totalBooked, icon: <Clock className="w-5 h-5" />, color: "from-orange-500 to-orange-600", bg: "bg-orange-50", text: "text-orange-600" },
          ].map(({ label, value, icon, color }) => (
            <div key={label} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-md shrink-0`}>
                <div className="text-white">{icon}</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-800">{loading ? "—" : value}</div>
                <div className="text-xs text-slate-500">{label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Add Provider + Set Slots */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-teal-500 to-teal-600 px-6 py-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                <PlusCircle className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-sm">Add Provider</h3>
                <p className="text-teal-100 text-xs">Register a new provider account</p>
              </div>
            </div>
            <div className="p-6">
              <form onSubmit={onCreateDoctor} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Full Name</label>
                    <input className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all" value={newDoctor.fullName} onChange={(e) => setNewDoctor((p) => ({ ...p, fullName: e.target.value }))} required />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Email</label>
                    <input type="email" className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all" value={newDoctor.email} onChange={(e) => setNewDoctor((p) => ({ ...p, email: e.target.value }))} required />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Initial Password</label>
                    <input type="password" className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all" value={newDoctor.password} onChange={(e) => setNewDoctor((p) => ({ ...p, password: e.target.value }))} minLength={6} required />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Specialty</label>
                    <input className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all" value={newDoctor.specialty} onChange={(e) => setNewDoctor((p) => ({ ...p, specialty: e.target.value }))} placeholder="e.g., Crop Advisor" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">License Number</label>
                    <input className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all" value={newDoctor.licenseNumber} onChange={(e) => setNewDoctor((p) => ({ ...p, licenseNumber: e.target.value }))} />
                  </div>
                </div>
                <button className="w-full py-3 rounded-lg bg-gradient-to-r from-teal-500 to-teal-600 text-white text-sm font-semibold shadow-md hover:shadow-lg hover:from-teal-600 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2" disabled={creating}>
                  {creating ? (
                    <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Adding...</>
                  ) : (
                    <><PlusCircle className="w-4 h-4" /> Add Provider</>
                  )}
                </button>
              </form>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                <CalendarDays className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-sm">Set Provider Time Slots</h3>
                <p className="text-blue-100 text-xs">Configure available time slots for a provider</p>
              </div>
            </div>
            <div className="p-6">
              <form onSubmit={onSaveSlots} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Provider</label>
                  <select className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" value={slotForm.doctorId} onChange={(e) => setSlotForm((p) => ({ ...p, doctorId: e.target.value }))} required>
                    <option value="">Select a provider</option>
                    {doctorOptions.map((d) => (<option key={d.id} value={d.id}>{d.label}</option>))}
                  </select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Date</label>
                    <input type="date" className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" value={slotForm.date} onChange={(e) => setSlotForm((p) => ({ ...p, date: e.target.value }))} required />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Times (HH:MM, 24h)</label>
                    <input className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" value={slotForm.timesCsv} onChange={(e) => setSlotForm((p) => ({ ...p, timesCsv: e.target.value }))} placeholder="09:00, 09:30, 10:00" required />
                  </div>
                </div>
                <button className="w-full py-3 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm font-semibold shadow-md hover:shadow-lg hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2" disabled={!slotForm.doctorId || slotSaving}>
                  <CalendarDays className="w-4 h-4" /> {slotSaving ? "Saving..." : "Save Slots"}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Providers Grid */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center">
                <Users className="w-4 h-4 text-teal-600" />
              </div>
              <h3 className="font-semibold text-slate-800 text-sm">Registered Providers</h3>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">{doctors.length} providers</span>
              <button onClick={loadDoctors} disabled={loading} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600 text-xs font-medium hover:bg-slate-50 transition-all">
                <RefreshCw size={14} /> Refresh
              </button>
            </div>
          </div>
          <div className="p-6">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (<div key={i} className="h-32 bg-slate-100 rounded-xl animate-pulse" />))}
              </div>
            ) : doctors.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                  <Users className="w-5 h-5 text-slate-400" />
                </div>
                <p className="text-slate-500 text-sm">No providers registered yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {doctors.map((d) => (
                  <div key={d._id} className="p-5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-teal-50 hover:border-teal-200 transition-all">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-teal-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                        {d.fullName?.charAt(0) || "P"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800">{d.fullName}</p>
                        <p className="text-xs text-slate-500">{d.specialty || "General"}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{d.email}</p>

                        <div className="mt-2 flex items-center gap-2">
                          <StarRating readOnly value={d.averageRating || 0} size={14} />
                          <span className="text-xs text-slate-600 font-medium">
                            {(Number(d.averageRating || 0)).toFixed(1)}
                            {typeof d.ratingCount === "number" ? ` (${d.ratingCount})` : ""}
                          </span>
                        </div>
                      </div>
                      <button onClick={() => onDeleteDoctor(d._id)} className="w-8 h-8 rounded-full flex items-center justify-center border border-red-200 text-red-400 hover:bg-red-50 transition-all shrink-0">
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${d.isAvailable ? "bg-green-50 text-green-700 border border-green-200" : "bg-slate-100 text-slate-500 border border-slate-200"}`}>
                        {d.isAvailable ? "Available" : "Unavailable"}
                      </span>
                      <span className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-medium">
                        {d.stats?.total ?? 0} bookings
                      </span>

                      <button
                        type="button"
                        onClick={() => toggleReviews(d._id)}
                        className="text-xs px-2 py-1 rounded-full bg-white border border-slate-200 text-slate-700 font-medium hover:border-teal-200 hover:text-teal-700 transition-all inline-flex items-center gap-1"
                      >
                        <MessageSquareText className="w-3 h-3" />
                        {openReviewsDoctorId === d._id ? "Hide Reviews" : "View Reviews"}
                      </button>
                    </div>

                    {openReviewsDoctorId === d._id && (
                      <div className="mt-3 pt-3 border-t border-slate-200">
                        {reviewsLoadingDoctorId === d._id ? (
                          <p className="text-xs text-slate-500">Loading reviews…</p>
                        ) : (
                          (() => {
                            const payload = reviewsByDoctorId[d._id];
                            const reviews = Array.isArray(payload?.reviews) ? payload.reviews : [];

                            if (reviews.length === 0) {
                              return <p className="text-xs text-slate-500">No reviews yet.</p>;
                            }

                            return (
                              <div className="space-y-2">
                                {reviews.slice(0, 10).map((r) => (
                                  <div key={r._id} className="p-3 rounded-lg border border-slate-200 bg-white">
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="min-w-0">
                                        <p className="text-xs font-semibold text-slate-800 truncate">
                                            {r.patient?.fullName || "Farmer"}
                                          {r.appointment?.date ? (
                                            <span className="text-slate-400 font-normal"> • {r.appointment.date} {r.appointment.time || ""}</span>
                                          ) : null}
                                        </p>
                                      </div>
                                      <StarRating readOnly value={r.rating || 0} size={14} />
                                    </div>
                                    {r.comment ? (
                                      <p className="text-xs text-slate-600 mt-1" style={{ whiteSpace: "pre-wrap" }}>{r.comment}</p>
                                    ) : (
                                      <p className="text-xs text-slate-400 mt-1 italic">No comment</p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            );
                          })()
                        )}
                      </div>
                    )}

                    {Array.isArray(d.slots) && d.slots.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-200">
                        <p className="text-xs text-slate-500 font-semibold mb-2">Upcoming Slots</p>
                        <div className="flex flex-wrap gap-1.5">
                          {d.slots.slice(0, 3).map((s) => (
                            <span key={s.date} className="text-xs px-2 py-1 rounded-md bg-white border border-slate-200 text-slate-600">
                              {s.date}: {(s.times || []).join(", ")}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Reports + Upload */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center">
                <FileText className="w-4 h-4 text-teal-600" />
              </div>
              <h3 className="font-semibold text-slate-800 text-sm">Farmer Reports & Upload</h3>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left: Search + Upload */}
              <div className="space-y-4">
                <div className="flex gap-2">
                  <input className="flex-1 px-3 py-2.5 rounded-lg border border-slate-300 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all" placeholder="Search farmer name/email" value={patientSearch} onChange={(e) => setPatientSearch(e.target.value)} />
                  <button onClick={loadPatients} disabled={patientsLoading} className="px-4 py-2.5 rounded-lg border border-slate-300 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-all disabled:opacity-50">
                    {patientsLoading ? "..." : <RefreshCw size={14} />}
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Farmer</label>
                  <select className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all" value={selectedPatientId} onChange={(e) => setSelectedPatientId(e.target.value)}>
                    <option value="">Select farmer</option>
                    {patients.map((p) => (<option key={p._id} value={p._id}>{p.fullName} {p.email ? `(${p.email})` : ""}</option>))}
                  </select>
                </div>

                {/* Upload Form */}
                <div className="mt-6 p-4 rounded-xl border border-slate-200 bg-slate-50">
                  <h4 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                    <FileText className="w-4 h-4" /> Upload Report PDF
                  </h4>
                  <form onSubmit={onUploadReport} className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Title</label>
                      <input className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" value={reportForm.title} onChange={(e) => setReportForm((p) => ({ ...p, title: e.target.value }))} required />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Notes (optional)</label>
                      <textarea className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" rows={3} value={reportForm.notes} onChange={(e) => setReportForm((p) => ({ ...p, notes: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">PDF File</label>
                      <input ref={fileRef} type="file" accept="application/pdf,.pdf" className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm file:mr-3 file:px-3 file:py-1 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-teal-50 file:text-teal-700" onChange={(e) => setReportForm((p) => ({ ...p, file: e.target.files?.[0] || null }))} required />
                    </div>
                    <button className="w-full py-2.5 rounded-lg bg-teal-500 text-white text-sm font-semibold hover:bg-teal-600 disabled:opacity-50 transition-all" disabled={uploadingReport}>
                      {uploadingReport ? "Uploading..." : "Upload Report"}
                    </button>
                  </form>
                </div>
              </div>

              {/* Right: Reports List */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-slate-700">Reports</h4>
                  {selectedPatientId && (
                    <button onClick={() => loadReportsForPatient(selectedPatientId)} disabled={reportsLoading} className="text-xs text-teal-600 font-medium hover:underline disabled:opacity-50">
                      {reportsLoading ? "Loading..." : "Refresh"}
                    </button>
                  )}
                </div>
                {!selectedPatientId ? (
                  <div className="text-center py-12 rounded-xl border border-dashed border-slate-200">
                    <UserCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-slate-500 text-xs">Select a farmer to view reports</p>
                  </div>
                ) : reportsLoading ? (
                  <div className="space-y-2">{[1, 2, 3].map((i) => (<div key={i} className="h-16 bg-slate-100 rounded-lg animate-pulse" />))}</div>
                ) : patientReports.length === 0 ? (
                  <div className="text-center py-12 rounded-xl border border-dashed border-slate-200">
                    <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-slate-500 text-xs">No reports for this farmer</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {patientReports.map((r) => (
                      <div key={r._id} className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50 hover:bg-teal-50 transition-all">
                        <div className="w-8 h-8 rounded-md bg-teal-100 flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4 text-teal-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800">{r.title}</p>
                          <p className="text-xs text-slate-500">{new Date(r.createdAt).toLocaleDateString()}</p>
                          {r.doctor?.fullName && <p className="text-xs text-teal-600 mt-0.5">Provider: {r.doctor.fullName}</p>}
                          {r.notes && <p className="text-xs text-slate-600 mt-1 line-clamp-2" style={{ whiteSpace: "pre-wrap" }}>{r.notes}</p>}
                        </div>
                        {(r.fileUrl || r.filePublicId) && (
                          <a href={`${apiBase}/admin/reports/${r._id}/download`} target="_blank" rel="noreferrer" className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center hover:bg-teal-100 transition-all shrink-0">
                            <FileText className="w-3.5 h-3.5 text-slate-600" />
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

        {/* Booking History */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
                <Clock className="w-4 h-4 text-orange-600" />
              </div>
              <h3 className="font-semibold text-slate-800 text-sm">Booking History</h3>
            </div>
            <select className="px-3 py-1.5 rounded-lg border border-slate-300 bg-slate-50 text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500" value={historyDoctorId} onChange={(e) => { setHistoryDoctorId(e.target.value); loadHistory(e.target.value); }}>
              <option value="">All providers</option>
              {doctorOptions.map((d) => (<option key={d.id} value={d.id}>{d.label}</option>))}
            </select>
          </div>
          <div className="p-6">
            {historyLoading ? (
              <div className="space-y-2">{[1, 2, 3].map((i) => (<div key={i} className="h-16 bg-slate-100 rounded-lg animate-pulse" />))}</div>
            ) : history.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500 text-xs">No bookings yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {history.map((a) => (
                  <div key={a._id} className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-teal-50 hover:border-teal-100 transition-all">
                    <div className="w-10 h-10 rounded-full bg-teal-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {a.patient?.fullName?.charAt(0) || "P"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800">{a.patient?.fullName} <span className="text-xs text-slate-500 font-normal">({a.patient?.patientType})</span></p>
                      <p className="text-xs text-slate-500">Provider: {a.doctor?.fullName}{a.doctor?.specialty ? ` — ${a.doctor.specialty}` : ""}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                        <CalendarDays className="w-3 h-3" /> {a.date} <Clock className="w-3 h-3 ml-2" /> {a.time}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${a.mode === "online" ? "bg-blue-50 text-blue-600 border border-blue-200" : "bg-slate-100 text-slate-600 border border-slate-200"}`}>
                          {a.mode === "online" && <Video className="w-3 h-3 inline mr-1" />}{a.mode === "online" ? "Remote" : "On-site"}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${a.status === "completed" ? "bg-green-50 text-green-600 border border-green-200" : a.status === "booked" ? "bg-blue-50 text-blue-600 border border-blue-200" : "bg-slate-100 text-slate-500 border border-slate-200"}`}>
                          {a.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
