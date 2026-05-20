import { Link } from "react-router-dom";
import {
  Video,
  ShieldCheck,
  Clock,
  Users,
  CheckCircle,
  ArrowRight,
  CreditCard,
  Zap,
  CalendarCheck,
  FileText,
  Activity,
  Globe,
  Lock,
  Award,
  Sprout,
  Tractor,
  Wrench,
  Building2,
} from "lucide-react";

const features = [
  {
    icon: <ShieldCheck size={24} />,
    title: "Verified Providers",
    desc: "Every service provider on our platform is verified so you can book with confidence.",
    color: "teal",
    img: "https://images.unsplash.com/photo-1501004318641-b39e6451bec6?w=400&q=70",
  },
  {
    icon: <Video size={24} />,
    title: "Remote Support",
    desc: "Coordinate remotely via Google Meet when on-site work isn’t needed.",
    color: "blue",
    img: "https://images.unsplash.com/photo-1523741543316-beb7fc7023d8?w=400&q=70",
  },
  {
    icon: <Zap size={24} />,
    title: "Fast Bookings",
    desc: "Book a slot in under 60 seconds. Same-day bookings available with nearby providers.",
    color: "orange",
    img: "https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=400&q=70",
  },
  {
    icon: <CreditCard size={24} />,
    title: "Affordable Services",
    desc: "Transparent pricing with no subscriptions—pay only for what you book.",
    color: "green",
    img: "https://images.unsplash.com/photo-1603189343302-e603f7add05d?w=400&q=70",
  },
  {
    icon: <FileText size={24} />,
    title: "Digital Reports",
    desc: "Store and access farm reports and service notes anytime—right from your dashboard.",
    color: "purple",
    img: "https://images.unsplash.com/photo-1499529112087-3cb3b73cec95?w=400&q=70",
  },
  {
    icon: <Clock size={24} />,
    title: "Extended Hours",
    desc: "Available 8 AM – 10 PM every day. Early mornings or late evenings — we fit your schedule.",
    color: "rose",
    img: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=400&q=70",
  },
];

const steps = [
  {
    icon: <Users size={22} />,
    title: "Create Account",
    desc: "Register in under 30 seconds with your basic details",
  },
  {
    icon: <CalendarCheck size={22} />,
    title: "Book a Slot",
    desc: "Choose your preferred provider and time slot instantly",
  },
  {
    icon: <Video size={22} />,
    title: "Connect Remotely",
    desc: "Coordinate via secure video call from anywhere",
  },
  {
    icon: <FileText size={22} />,
    title: "Get Summary",
    desc: "Receive a digital summary right after the job",
  },
];

const Home = () => {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-teal-600 via-teal-500 to-emerald-500 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" viewBox="0 0 1200 700" preserveAspectRatio="xMidYMid slice">
            <circle cx="900" cy="100" r="300" fill="white" />
            <circle cx="200" cy="600" r="250" fill="white" />
            <circle cx="1100" cy="500" r="200" fill="white" />
          </svg>
        </div>
        <div className="max-w-7xl mx-auto px-6 py-20 md:py-28">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/15 backdrop-blur-sm text-teal-100 text-sm font-medium mb-6 border border-white/20">
                <Sprout className="w-4 h-4 text-emerald-200" />
                Agriculture, reimagined for you
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
                Book farm assets
                <span className="block text-yellow-300">Without the wait</span>
              </h1>
              <p className="text-teal-100 text-lg md:text-xl leading-relaxed mb-8 max-w-lg">
                Skip the delays and middlemen. Connect farmers, service providers, and village operators for tractor booking, labor booking, crop advice, weather alerts, and GPS tracking.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link
                  to="/farmer/register"
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-white text-teal-700 font-bold text-base shadow-xl hover:shadow-2xl hover:-translate-y-0.5 transition-all"
                >
                  Get Started Free <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/farmer/login"
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-white/15 backdrop-blur-sm text-white font-semibold text-base border border-white/30 hover:bg-white/25 transition-all"
                >
                  Sign In
                </Link>
              </div>
            </div>
            <div className="relative hidden lg:block">
              <div className="relative">
                <img
                  src="https://images.unsplash.com/photo-1461354464878-ad92f492a5a0?w=600&q=80"
                  alt="Farm machinery and service booking"
                  className="rounded-3xl shadow-2xl w-full object-cover"
                  style={{ height: "480px" }}
                />
                <div className="absolute -bottom-6 -left-6 bg-white rounded-2xl p-4 shadow-xl flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center">
                    <CalendarCheck className="w-6 h-6 text-teal-600" />
                  </div>
                  <div>
                    <p className="text-slate-800 font-bold text-lg">Instant</p>
                    <p className="text-slate-500 text-xs">Machine Booking</p>
                  </div>
                </div>
                <div className="absolute -top-4 -right-4 bg-white rounded-2xl p-4 shadow-xl flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-slate-800 font-semibold text-sm">Verified</p>
                    <p className="text-slate-500 text-xs">Nearby service providers</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <span className="inline-block px-4 py-1.5 rounded-full bg-teal-50 text-teal-600 text-xs font-semibold uppercase tracking-wide mb-3 border border-teal-200">
              What AgriHub Offers
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-3">
              Everything you need in one place
            </h2>
            <p className="text-slate-500 text-base max-w-2xl mx-auto">
              From booking to live tracking — we handle the full workflow so you can focus on your farm.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map(({ icon, title, desc, color, img }) => (
              <div
                key={title}
                className="group bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
              >
                <img
                  src={img}
                  alt={title}
                  className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="p-6">
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${
                      color === "teal"
                        ? "bg-teal-100 text-teal-600"
                        : color === "blue"
                        ? "bg-blue-100 text-blue-600"
                        : color === "orange"
                        ? "bg-orange-100 text-orange-600"
                        : color === "green"
                        ? "bg-green-100 text-green-600"
                        : color === "purple"
                        ? "bg-purple-100 text-purple-600"
                        : "bg-rose-100 text-rose-600"
                    }`}
                  >
                    {icon}
                  </div>
                  <h3 className="font-bold text-slate-800 text-base mb-2">{title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 bg-gradient-to-br from-slate-50 to-teal-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <span className="inline-block px-4 py-1.5 rounded-full bg-teal-50 text-teal-600 text-xs font-semibold uppercase tracking-wide mb-3 border border-teal-200">
              Simple Process
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-3">
              Book in 4 Easy Steps
            </h2>
            <p className="text-slate-500 text-base max-w-xl mx-auto">
              From sign-up to service completion — the whole flow is designed to be quick in the field.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map(({ icon, title, desc }, i) => (
              <div
                key={title}
                className="relative bg-white rounded-2xl border border-slate-200 p-6 text-center shadow-sm hover:shadow-md hover:-translate-y-1 transition-all"
              >
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center mx-auto mb-4 text-white shadow-md">
                  {icon}
                </div>
                <span className="absolute top-4 right-4 text-5xl font-bold text-slate-100 select-none">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="font-bold text-slate-800 text-base mb-2">{title}</h3>
                <p className="text-slate-500 text-sm">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For Whom Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-3">
              Who Is AgriHub For?
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              {
                icon: <Tractor size={28} />,
                title: "Farmers and Crop Managers",
                desc: "Book tractors, threshers, and local machines without spending hours calling around.",
              },
              {
                icon: <Wrench size={28} />,
                title: "Service Providers on the Move",
                desc: "List machines, assign operators, and accept bookings that fit your route and schedule.",
              },
              {
                icon: <Building2 size={28} />,
                title: "Village Operations Teams",
                desc: "Coordinate labor, manage shared assets, and keep every booking visible for the whole village.",
              },
            ].map(({ icon, title, desc }) => (
              <div
                key={title}
                className="text-center p-8 rounded-2xl border border-slate-200 bg-slate-50 hover:shadow-md hover:-translate-y-1 transition-all"
              >
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center mx-auto mb-4 text-white shadow-md">
                  {icon}
                </div>
                <h3 className="font-bold text-slate-800 text-base mb-2">{title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-20 bg-gradient-to-r from-teal-600 to-emerald-500 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" viewBox="0 0 800 400">
            <circle cx="700" cy="0" r="300" fill="white" />
            <circle cx="0" cy="400" r="250" fill="white" />
          </svg>
        </div>
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <Sprout className="w-12 h-12 text-white/80 mx-auto mb-4" />
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-teal-100 text-lg mb-8 max-w-2xl mx-auto">
            Join AgriHub today and experience farm services built around your convenience. Free to register, pay only for what you book.
          </p>
          <Link
            to="/farmer/register"
            className="inline-flex items-center gap-2 px-10 py-4 rounded-full bg-white text-teal-700 font-bold text-base shadow-xl hover:shadow-2xl hover:-translate-y-0.5 transition-all"
          >
            Create Free Account <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="py-12 bg-white border-t border-slate-200">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16">
            {[
              { icon: <Lock size={18} />, label: "Secure booking" },
              { icon: <Globe size={18} />, label: "Local language ready" },
              { icon: <Award size={18} />, label: "Verified providers" },
              { icon: <Users size={18} />, label: "Farmer first" },
            ].map(({ icon, label }) => (
              <div key={label} className="flex items-center gap-2 text-slate-500 text-sm font-medium">
                <span className="text-teal-600">{icon}</span>
                {label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <span className="text-white font-bold text-base">AgriHub</span>
            </div>
            <div className="flex flex-wrap gap-6 text-sm">
              <a href="#features" className="hover:text-teal-400 transition-colors">
                Features
              </a>
              <a href="#how-it-works" className="hover:text-teal-400 transition-colors">
                How It Works
              </a>
              <Link to="/farmer/login" className="hover:text-teal-400 transition-colors">
                Farmer Login
              </Link>
              <Link to="/farmer/register" className="hover:text-teal-400 transition-colors">
                Register
              </Link>
            </div>
            <p className="text-xs text-slate-500">© 2026 AgriHub. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
