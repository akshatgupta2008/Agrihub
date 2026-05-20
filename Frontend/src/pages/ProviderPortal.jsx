import { useEffect, useState } from "react";
import { Award, Clock } from "lucide-react";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import { StarRating } from "../components/StarRating";

const ProviderPortal = () => {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await axiosInstance.get("/public/doctors");
        setProviders(res.data);
      } catch (e) {
        toast.error(e?.response?.data?.message || "Failed to load providers");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="mb-2">Machines & Service Providers</h1>
        <p className="text-muted">Verified providers and their current availability.</p>
      </div>

      {loading ? (
        <p className="text-muted">Loading...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {providers.map((provider) => (
            <div key={provider._id} className="card p-6 flex flex-col">
              <div className="mb-3">
                <h3 style={{ fontSize: "1.25rem", marginBottom: "0.25rem" }}>{provider.fullName}</h3>
                <p className="text-muted" style={{ fontWeight: 500 }}>{provider.specialty || "Services"}</p>
              </div>

              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <StarRating readOnly value={provider.averageRating || 0} />
                  <span className="text-muted" style={{ fontSize: "0.875rem" }}>
                    {(provider.averageRating || 0).toFixed ? (provider.averageRating || 0).toFixed(1) : provider.averageRating || 0}
                    {typeof provider.ratingCount === "number" ? ` (${provider.ratingCount})` : ""}
                  </span>
                </div>
              </div>

              <div className="mb-4">
                <div className="badge success mb-3 flex items-center gap-1 inline-flex">
                  <Award size={14} />
                  {provider.licenseNumber ? `Registration #${provider.licenseNumber}` : "Verified"}
                </div>
                <div className={`badge ${provider.isAvailable ? "success" : "warning"}`}>
                  {provider.isAvailable ? "Available" : "Unavailable"}
                </div>
              </div>

              <div className="mt-auto border-t pt-4 border-gray-100">
                <h4 className="flex items-center gap-2 mb-2 text-sm" style={{ fontSize: "0.875rem", color: "var(--color-text-muted)" }}>
                  <Clock size={16} /> Next slots are shown in farmer dashboard
                </h4>
                <div className="text-muted" style={{ fontSize: "0.875rem" }}>
                  Farmers can request bookings from their dashboard after login.
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProviderPortal;
