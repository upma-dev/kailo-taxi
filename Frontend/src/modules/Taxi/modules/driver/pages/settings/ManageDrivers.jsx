import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Edit3, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getOwnerFleetDrivers } from "../../services/registrationService";
import DriverBottomNav from "../../../shared/components/DriverBottomNav";

const ManageDrivers = () => {
  const navigate = useNavigate();
  const routePrefix = String(localStorage.getItem("role") || "driver").toLowerCase() === "owner"
    ? "/taxi/owner"
    : "/taxi/driver";
  const [drivers, setDrivers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const unwrap = (response) =>
    response?.data?.data || response?.data || response;

  useEffect(() => {
    let active = true;

    const load = async () => {
      setIsLoading(true);
      setError("");

      try {
        const response = await getOwnerFleetDrivers();
        const payload = unwrap(response);
        const results = payload?.results || [];

        if (!active) return;

        setDrivers(
          results.map((item) => ({
            id: item.id || item._id,
            name: item.name || "-",
            phone: item.phone || "-",
            email: item.email || "-",
            address: item.city || "-",
            salary: Number(item.salary || 0),
            status:
              item.approve === true ||
              item.approve === 1 ||
              String(item.status || "").toLowerCase() === "approved"
                ? "Active"
                : "Pending",
          })),
        );
      } catch (err) {
        if (!active) return;
        setError(err?.message || "Unable to load fleet drivers");
        setDrivers([]);
      } finally {
        if (active) setIsLoading(false);
      }
    };

    load();

    return () => {
      active = false;
    };
  }, []);

  const activeCount = useMemo(
    () => drivers.filter((d) => d.status === "Active").length,
    [drivers],
  );

  return (
    <div
      className="min-h-screen bg-[#f8f9fb] px-5 pb-32 pt-8 overflow-x-hidden"
      style={{ fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" }}
    >
      <header className="mb-6 flex items-center gap-3">
        <button
          type="button"
          aria-label="Back"
          onClick={() => navigate(routePrefix === "/taxi/owner" ? "/taxi/owner/home" : `${routePrefix}/profile`)}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-800 shadow-sm"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Drivers</h1>
          <p className="text-xs font-medium text-slate-500">Taxi drivers working for your fleet</p>
        </div>
      </header>

      <main className="space-y-5">
        {/* summary: plain numbers from the list below */}
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid grid-cols-3 divide-x divide-slate-100 text-center">
            {[
              ["Total", drivers.length],
              ["Active", activeCount],
              ["Pending", drivers.length - activeCount],
            ].map(([label, value]) => (
              <div key={label} className="px-2">
                <p className="text-2xl font-extrabold text-slate-900">{isLoading ? "-" : value}</p>
                <p className="mt-0.5 text-xs font-semibold text-slate-500">{label}</p>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => navigate(`${routePrefix}/add-driver`)}
            className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 text-sm font-bold text-white active:scale-[0.99]"
          >
            <Plus size={17} strokeWidth={2.5} /> Add a driver
          </button>
        </section>

        <section className="space-y-3">
          <h2 className="px-1 text-sm font-bold text-slate-700">Your drivers</h2>

          {isLoading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm font-medium text-slate-500">
              Loading drivers...
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-rose-100 bg-rose-50 p-5 text-sm font-semibold text-rose-600">
              {error}
            </div>
          ) : drivers.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
              <p className="text-sm font-bold text-slate-800">No drivers added yet</p>
              <p className="mt-1 text-xs font-medium text-slate-500">
                Add a driver with their name, mobile number and licence details. They can then log in with that number.
              </p>
            </div>
          ) : (
            drivers.map((d) => (
              <article key={d.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-base font-bold text-slate-900">{d.name}</h3>
                    <span
                      className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        d.status === "Active" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {d.status === "Active" ? "Approved" : "Waiting for approval"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      navigate(`${routePrefix}/edit-driver/${d.id}`, {
                        state: { driver: d, returnTo: `${routePrefix}/manage-drivers` },
                      })
                    }
                    className="flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700"
                  >
                    <Edit3 size={14} /> Edit
                  </button>
                </div>

                <dl className="mt-4 divide-y divide-slate-100 rounded-xl bg-slate-50 text-sm">
                  {[
                    ["Mobile", d.phone],
                    ["Email", d.email],
                    ["City", d.address],
                    ["Monthly salary", d.salary > 0 ? `₹${Number(d.salary).toLocaleString("en-IN")}` : "-"],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between gap-4 px-3.5 py-2.5">
                      <dt className="font-medium text-slate-500">{label}</dt>
                      <dd className="min-w-0 truncate text-right font-semibold text-slate-900">{value || "-"}</dd>
                    </div>
                  ))}
                </dl>
              </article>
            ))
          )}
        </section>
      </main>

      <DriverBottomNav />
    </div>
  );
};

export default ManageDrivers;
