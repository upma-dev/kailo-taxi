import { jsx, jsxs } from "react/jsx-runtime";
import React, { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  CreditCard,
  Eye,
  Loader2,
  MapPin,
  Phone,
  Search,
  ShieldCheck,
  User2,
  X
} from "lucide-react";
import toast from "react-hot-toast";
import { adminService } from "../../services/adminService";
const inputClass = "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition-all focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100/60";
const statusClasses = {
  pending: "bg-amber-50 text-amber-700 border-amber-100",
  confirmed: "bg-sky-50 text-sky-700 border-sky-100",
  assigned: "bg-violet-50 text-violet-700 border-violet-100",
  end_requested: "bg-orange-50 text-orange-700 border-orange-100",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-100",
  cancelled: "bg-rose-50 text-rose-700 border-rose-100"
};
const bookingStatusOptions = [
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "assigned", label: "Assigned" },
  { value: "end_requested", label: "End Requested" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" }
];
const paymentStatusClasses = {
  pending: "bg-amber-50 text-amber-700 border-amber-100",
  paid: "bg-emerald-50 text-emerald-700 border-emerald-100",
  not_required: "bg-slate-100 text-slate-600 border-slate-200",
  failed: "bg-rose-50 text-rose-700 border-rose-100"
};
const formatDateTime = (value) => {
  const parsed = value ? new Date(value) : null;
  if (!parsed || Number.isNaN(parsed.getTime())) return "Not set";
  return parsed.toLocaleString();
};
const formatAmount = (value) => `Rs.${Number(value || 0)}`;
const toRentalRequestList = (response) => {
  const candidates = [
    response?.data?.data?.results,
    response?.data?.results,
    response?.results,
    response?.data?.data,
    response?.data
  ];
  const firstArray = candidates.find((candidate) => Array.isArray(candidate));
  return Array.isArray(firstArray) ? firstArray : [];
};
const formatElapsed = (totalSeconds) => {
  const seconds = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  return `${Math.floor(seconds / 3600)}h ${String(Math.floor(seconds % 3600 / 60)).padStart(2, "0")}m ${String(seconds % 60).padStart(2, "0")}s`;
};
const LiveBilling = ({ request, loadedAt }) => {
  const metrics = request?.rideMetrics;
  const [now, setNow] = useState(() => Date.now());
  const isRunning = ["confirmed", "assigned"].includes(String(request?.status || ""));
  useEffect(() => {
    if (!isRunning) return void 0;
    const timer = window.setInterval(() => setNow(Date.now()), 1e3);
    return () => window.clearInterval(timer);
  }, [isRunning]);
  if (!metrics || !["confirmed", "assigned", "end_requested", "completed"].includes(String(request?.status || ""))) {
    return null;
  }
  const baseSeconds = Number(metrics.elapsedSeconds ?? Number(metrics.elapsedMinutes || 0) * 60);
  const elapsedSeconds = isRunning ? baseSeconds + Math.max(0, (now - loadedAt) / 1e3) : baseSeconds;
  const elapsedHours = elapsedSeconds / 3600;
  const includedHours = Math.max(1, Number(metrics.includedHours || 1));
  const hourlyRate = Number(metrics.hourlyRate || 0);
  const overtimeRate = Number(metrics.extraHourRate || 0) > 0 ? Number(metrics.extraHourRate) : hourlyRate;
  const advance = Number(request.payableNow || 0);
  const running = elapsedHours <= includedHours ? hourlyRate * elapsedHours : Number(metrics.basePrice || 0) + (elapsedHours - includedHours) * overtimeRate;
  const charge = isRunning ? Math.max(advance, running) : Number(request.finalCharge || metrics.currentCharge || 0);
  const due = Math.max(0, charge - advance);
  return /* @__PURE__ */ jsxs("div", { className: "rounded-[24px] border border-orange-200 bg-orange-50/60 p-5", children: [
    /* @__PURE__ */ jsx("p", { className: "text-[11px] font-black uppercase tracking-[0.2em] text-orange-500", children: isRunning ? "Live billing" : "Final billing" }),
    /* @__PURE__ */ jsxs("div", { className: "mt-4 grid gap-4 md:grid-cols-3", children: [
      /* @__PURE__ */ jsxs("div", { className: "rounded-2xl bg-white px-4 py-4", children: [
        /* @__PURE__ */ jsx("p", { className: "text-xs font-bold uppercase tracking-wide text-slate-500", children: "Time elapsed" }),
        /* @__PURE__ */ jsx("p", { className: "mt-3 text-lg font-black text-slate-900", children: formatElapsed(elapsedSeconds) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "rounded-2xl bg-white px-4 py-4", children: [
        /* @__PURE__ */ jsx("p", { className: "text-xs font-bold uppercase tracking-wide text-slate-500", children: "Bill till now" }),
        /* @__PURE__ */ jsxs("p", { className: "mt-3 text-lg font-black text-slate-900", children: [
          "Rs.",
          charge.toFixed(2)
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "rounded-2xl bg-white px-4 py-4", children: [
        /* @__PURE__ */ jsx("p", { className: "text-xs font-bold uppercase tracking-wide text-slate-500", children: "Due at drop-off" }),
        /* @__PURE__ */ jsxs("p", { className: "mt-3 text-lg font-black text-slate-900", children: [
          "Rs.",
          due.toFixed(2)
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("p", { className: "mt-3 text-xs font-semibold text-slate-500", children: [
      "Rs.",
      hourlyRate.toFixed(2),
      "/hr for the first ",
      includedHours,
      " hr, then Rs.",
      overtimeRate.toFixed(2),
      "/hr. Advance Rs.",
      advance.toFixed(0),
      " already paid."
    ] })
  ] });
};
const RentalBookingRequests = () => {
  const [loadedAt, setLoadedAt] = useState(() => Date.now());
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [page, setPage] = useState(1);
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const response = await adminService.getRentalBookingRequests();
        const results = toRentalRequestList(response);
        if (mounted) {
          setItems(results);
          setLoadedAt(Date.now());
        }
      } catch (error) {
        if (mounted) toast.error(error?.message || "Could not load rental requests.");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);
  useEffect(() => {
    setPage(1);
  }, [itemsPerPage, searchTerm]);
  const safeItems = useMemo(() => Array.isArray(items) ? items : [], [items]);
  const pendingCount = useMemo(() => safeItems.filter((item) => item?.status === "pending").length, [safeItems]);
  const paidCount = useMemo(() => safeItems.filter((item) => item?.paymentStatus === "paid").length, [safeItems]);
  const filteredItems = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return safeItems;
    return safeItems.filter(
      (item) => [
        item?.bookingReference,
        item?.vehicleName,
        item?.vehicleCategory,
        item?.selectedPackage?.label,
        item?.userId?.name,
        item?.contactName,
        item?.userId?.phone,
        item?.contactPhone,
        item?.serviceLocation?.name,
        item?.status,
        item?.paymentStatus
      ].filter(Boolean).some((value) => String(value).toLowerCase().includes(query))
    );
  }, [safeItems, searchTerm]);
  const totalEntries = filteredItems.length;
  const totalPages = Math.max(1, Math.ceil(totalEntries / itemsPerPage));
  const safePage = Math.min(page, totalPages);
  const paginatedItems = useMemo(() => {
    const start = (safePage - 1) * itemsPerPage;
    return filteredItems.slice(start, start + itemsPerPage);
  }, [filteredItems, itemsPerPage, safePage]);
  const showingFrom = totalEntries === 0 ? 0 : (safePage - 1) * itemsPerPage + 1;
  const showingTo = totalEntries === 0 ? 0 : showingFrom + paginatedItems.length - 1;
  const selectedRequest = useMemo(
    () => safeItems.find((item) => String(item?.id || item?._id) === String(selectedId)) || null,
    [safeItems, selectedId]
  );
  const updateLocal = (id, patch) => {
    setItems(
      (current) => (Array.isArray(current) ? current : []).map(
        (item) => String(item?.id || item?._id) === String(id) ? { ...item, ...patch } : item
      )
    );
  };
  const saveRequest = async () => {
    if (!selectedRequest) return;
    const id = String(selectedRequest.id || selectedRequest._id);
    setSavingId(id);
    try {
      const updated = await adminService.updateRentalBookingRequest(id, {
        status: selectedRequest.status,
        adminNote: selectedRequest.adminNote || ""
      });
      const payload = updated?.data?.data || updated?.data || updated;
      updateLocal(id, payload);
      setLoadedAt(Date.now());
      toast.success("Rental request updated");
    } catch (error) {
      toast.error(error?.message || "Could not update rental request.");
    } finally {
      setSavingId("");
    }
  };
  return /* @__PURE__ */ jsxs("div", { className: "min-h-screen bg-[#f6f7fb] p-6 lg:p-8", children: [
    /* @__PURE__ */ jsxs("div", { className: "mb-6 flex flex-wrap items-center justify-between gap-4", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("h1", { className: "text-2xl font-bold text-slate-900", children: "Rental Requests" }),
        /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm text-slate-500", children: "Minimal booking queue for rental requests. Open any row to inspect the full request details." })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex gap-3", children: [
        /* @__PURE__ */ jsxs("div", { className: "rounded-2xl border border-slate-200 bg-white px-5 py-4", children: [
          /* @__PURE__ */ jsx("p", { className: "text-xs font-semibold uppercase tracking-[0.2em] text-slate-400", children: "Pending" }),
          /* @__PURE__ */ jsx("p", { className: "mt-1 text-2xl font-black text-slate-900", children: pendingCount })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "rounded-2xl border border-slate-200 bg-white px-5 py-4", children: [
          /* @__PURE__ */ jsx("p", { className: "text-xs font-semibold uppercase tracking-[0.2em] text-slate-400", children: "Paid" }),
          /* @__PURE__ */ jsx("p", { className: "mt-1 text-2xl font-black text-slate-900", children: paidCount })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "rounded-[28px] border border-slate-200 bg-white shadow-sm", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-3 border-b border-slate-100 px-6 py-5 lg:flex-row lg:items-center lg:justify-between", children: [
        /* @__PURE__ */ jsxs("div", { className: "relative w-full max-w-md", children: [
          /* @__PURE__ */ jsx(Search, { size: 16, className: "absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" }),
          /* @__PURE__ */ jsx(
            "input",
            {
              type: "text",
              value: searchTerm,
              onChange: (event) => setSearchTerm(event.target.value),
              placeholder: "Search by booking ref, customer, vehicle, status",
              className: "w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-slate-300 focus:bg-white"
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 text-sm font-semibold text-slate-500", children: [
          /* @__PURE__ */ jsx("span", { children: "Rows per page" }),
          /* @__PURE__ */ jsxs(
            "select",
            {
              value: itemsPerPage,
              onChange: (event) => setItemsPerPage(Math.max(1, Number(event.target.value) || 10)),
              className: "rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 outline-none",
              children: [
                /* @__PURE__ */ jsx("option", { value: 5, children: "5" }),
                /* @__PURE__ */ jsx("option", { value: 10, children: "10" }),
                /* @__PURE__ */ jsx("option", { value: 20, children: "20" }),
                /* @__PURE__ */ jsx("option", { value: 30, children: "30" })
              ]
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "p-6", children: loading ? /* @__PURE__ */ jsx("div", { className: "flex min-h-[280px] items-center justify-center", children: /* @__PURE__ */ jsx(Loader2, { className: "animate-spin text-slate-400", size: 30 }) }) : paginatedItems.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "rounded-[24px] border border-dashed border-slate-200 bg-slate-50/60 px-8 py-14 text-center", children: [
        /* @__PURE__ */ jsx("h3", { className: "text-lg font-black text-slate-900", children: "No Rental Requests" }),
        /* @__PURE__ */ jsx("p", { className: "mt-2 text-sm font-medium text-slate-500", children: "No requests match the current search or no booking has been created yet." })
      ] }) : /* @__PURE__ */ jsx("div", { className: "overflow-x-auto", children: /* @__PURE__ */ jsxs("table", { className: "w-full min-w-[1080px] border-collapse", children: [
        /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { className: "border-b border-slate-100 text-left", children: [
          /* @__PURE__ */ jsx("th", { className: "px-4 py-3 text-[11px] font-black uppercase tracking-widest text-slate-400", children: "Booking Ref" }),
          /* @__PURE__ */ jsx("th", { className: "px-4 py-3 text-[11px] font-black uppercase tracking-widest text-slate-400", children: "Customer" }),
          /* @__PURE__ */ jsx("th", { className: "px-4 py-3 text-[11px] font-black uppercase tracking-widest text-slate-400", children: "Vehicle" }),
          /* @__PURE__ */ jsx("th", { className: "px-4 py-3 text-[11px] font-black uppercase tracking-widest text-slate-400", children: "Pickup" }),
          /* @__PURE__ */ jsx("th", { className: "px-4 py-3 text-[11px] font-black uppercase tracking-widest text-slate-400", children: "Location" }),
          /* @__PURE__ */ jsx("th", { className: "px-4 py-3 text-[11px] font-black uppercase tracking-widest text-slate-400", children: "Advance" }),
          /* @__PURE__ */ jsx("th", { className: "px-4 py-3 text-[11px] font-black uppercase tracking-widest text-slate-400", children: "Status" }),
          /* @__PURE__ */ jsx("th", { className: "px-4 py-3 text-[11px] font-black uppercase tracking-widest text-slate-400 text-right", children: "Action" })
        ] }) }),
        /* @__PURE__ */ jsx("tbody", { children: paginatedItems.map((item) => {
          const id = String(item.id || item._id);
          return /* @__PURE__ */ jsxs("tr", { className: "border-b border-slate-50 last:border-0", children: [
            /* @__PURE__ */ jsxs("td", { className: "px-4 py-4", children: [
              /* @__PURE__ */ jsx("p", { className: "text-sm font-black text-slate-900", children: item.bookingReference || "Not generated" }),
              /* @__PURE__ */ jsx("p", { className: "mt-1 text-xs font-semibold text-slate-400", children: formatDateTime(item.createdAt) })
            ] }),
            /* @__PURE__ */ jsxs("td", { className: "px-4 py-4", children: [
              /* @__PURE__ */ jsx("p", { className: "text-sm font-bold text-slate-800", children: item.userId?.name || item.contactName || "Unknown user" }),
              /* @__PURE__ */ jsx("p", { className: "mt-1 text-xs font-semibold text-slate-400", children: item.userId?.phone || item.contactPhone || "No phone" })
            ] }),
            /* @__PURE__ */ jsxs("td", { className: "px-4 py-4", children: [
              /* @__PURE__ */ jsx("p", { className: "text-sm font-bold text-slate-800", children: item.vehicleName || "Rental vehicle" }),
              /* @__PURE__ */ jsx("p", { className: "mt-1 text-xs font-semibold text-slate-400", children: item.selectedPackage?.label || item.vehicleCategory || "Rental" })
            ] }),
            /* @__PURE__ */ jsxs("td", { className: "px-4 py-4", children: [
              /* @__PURE__ */ jsx("p", { className: "text-sm font-bold text-slate-800", children: formatDateTime(item.pickupDateTime) }),
              /* @__PURE__ */ jsxs("p", { className: "mt-1 text-xs font-semibold text-slate-400", children: [
                Number(item.requestedHours || 0),
                " hrs"
              ] })
            ] }),
            /* @__PURE__ */ jsxs("td", { className: "px-4 py-4", children: [
              /* @__PURE__ */ jsx("p", { className: "text-sm font-bold text-slate-800", children: item.serviceLocation?.name || "Not selected" }),
              /* @__PURE__ */ jsx("p", { className: "mt-1 text-xs font-semibold text-slate-400", children: item.serviceLocation?.city || item.serviceLocation?.address || "-" })
            ] }),
            /* @__PURE__ */ jsxs("td", { className: "px-4 py-4", children: [
              /* @__PURE__ */ jsx("p", { className: "text-sm font-black text-slate-900", children: formatAmount(item.payableNow) }),
              /* @__PURE__ */ jsx("p", { className: "mt-1 text-xs font-semibold text-slate-400", children: item.paymentMethodLabel || item.paymentMethod || "Pending method" })
            ] }),
            /* @__PURE__ */ jsx("td", { className: "px-4 py-4", children: /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-2", children: [
              /* @__PURE__ */ jsx("span", { className: `inline-flex w-fit rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-wide ${statusClasses[item.status] || statusClasses.pending}`, children: item.status }),
              /* @__PURE__ */ jsx("span", { className: `inline-flex w-fit rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-wide ${paymentStatusClasses[item.paymentStatus] || paymentStatusClasses.pending}`, children: item.paymentStatus })
            ] }) }),
            /* @__PURE__ */ jsx("td", { className: "px-4 py-4", children: /* @__PURE__ */ jsx("div", { className: "flex justify-end", children: /* @__PURE__ */ jsxs(
              "button",
              {
                type: "button",
                onClick: () => setSelectedId(id),
                className: "inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50",
                children: [
                  /* @__PURE__ */ jsx(Eye, { size: 15 }),
                  "View Details"
                ]
              }
            ) }) })
          ] }, id);
        }) })
      ] }) }) }),
      /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-4 border-t border-slate-100 px-6 py-4 lg:flex-row lg:items-center lg:justify-between", children: [
        /* @__PURE__ */ jsxs("p", { className: "text-sm font-semibold text-slate-500", children: [
          "Showing ",
          showingFrom,
          " to ",
          showingTo,
          " of ",
          totalEntries,
          " requests"
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
          /* @__PURE__ */ jsxs(
            "button",
            {
              type: "button",
              onClick: () => setPage((current) => Math.max(1, current - 1)),
              disabled: safePage === 1,
              className: "inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40",
              children: [
                /* @__PURE__ */ jsx(ChevronLeft, { size: 16 }),
                "Prev"
              ]
            }
          ),
          /* @__PURE__ */ jsxs("span", { className: "text-sm font-black text-slate-800", children: [
            "Page ",
            safePage,
            " / ",
            totalPages
          ] }),
          /* @__PURE__ */ jsxs(
            "button",
            {
              type: "button",
              onClick: () => setPage((current) => Math.min(totalPages, current + 1)),
              disabled: safePage === totalPages,
              className: "inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40",
              children: [
                "Next",
                /* @__PURE__ */ jsx(ChevronRight, { size: 16 })
              ]
            }
          )
        ] })
      ] })
    ] }),
    selectedRequest ? /* @__PURE__ */ jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[2px]", children: /* @__PURE__ */ jsxs("div", { className: "relative max-h-[92vh] w-full max-w-4xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("p", { className: "text-[11px] font-black uppercase tracking-[0.22em] text-slate-400", children: "Rental Request Details" }),
          /* @__PURE__ */ jsx("h2", { className: "mt-1 text-2xl font-black text-slate-900", children: selectedRequest.bookingReference || "Rental booking" }),
          /* @__PURE__ */ jsxs("p", { className: "mt-1 text-sm font-semibold text-slate-500", children: [
            selectedRequest.vehicleName || "Rental vehicle",
            " \xB7 ",
            selectedRequest.selectedPackage?.label || selectedRequest.vehicleCategory || "Rental"
          ] })
        ] }),
        /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            onClick: () => setSelectedId(""),
            className: "rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50",
            children: /* @__PURE__ */ jsx(X, { size: 18 })
          }
        )
      ] }),
      /* @__PURE__ */ jsx("div", { className: "max-h-[calc(92vh-88px)] overflow-y-auto px-6 py-6", children: /* @__PURE__ */ jsxs("div", { className: "grid gap-6 xl:grid-cols-[1.4fr_0.8fr]", children: [
        /* @__PURE__ */ jsxs("div", { className: "space-y-6", children: [
          /* @__PURE__ */ jsxs("div", { className: "grid gap-4 md:grid-cols-2", children: [
            /* @__PURE__ */ jsxs("div", { className: "rounded-2xl bg-slate-50 px-4 py-4", children: [
              /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 text-slate-500", children: [
                /* @__PURE__ */ jsx(User2, { size: 15 }),
                /* @__PURE__ */ jsx("span", { className: "text-xs font-bold uppercase tracking-wide", children: "Customer" })
              ] }),
              /* @__PURE__ */ jsx("p", { className: "mt-3 text-sm font-black text-slate-900", children: selectedRequest.userId?.name || selectedRequest.contactName || "Unknown user" }),
              /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm font-semibold text-slate-500", children: selectedRequest.userId?.email || selectedRequest.contactEmail || "No email" }),
              /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm font-semibold text-slate-500", children: selectedRequest.userId?.phone || selectedRequest.contactPhone || "No phone" })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "rounded-2xl bg-slate-50 px-4 py-4", children: [
              /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 text-slate-500", children: [
                /* @__PURE__ */ jsx(CreditCard, { size: 15 }),
                /* @__PURE__ */ jsx("span", { className: "text-xs font-bold uppercase tracking-wide", children: "Payment" })
              ] }),
              /* @__PURE__ */ jsx("p", { className: "mt-3 text-sm font-black text-slate-900", children: selectedRequest.paymentMethodLabel || selectedRequest.paymentMethod || "Not selected" }),
              /* @__PURE__ */ jsxs("p", { className: "mt-1 text-sm font-semibold text-slate-500", children: [
                selectedRequest.advancePaymentLabel || "Advance booking payment",
                " \xB7 ",
                formatAmount(selectedRequest.payment?.amount || selectedRequest.payableNow)
              ] }),
              selectedRequest.payment?.paymentId ? /* @__PURE__ */ jsxs("p", { className: "mt-1 break-all text-xs font-semibold text-slate-400", children: [
                "Payment ID: ",
                selectedRequest.payment.paymentId
              ] }) : null
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "rounded-[24px] border border-slate-200 bg-white p-5", children: [
            /* @__PURE__ */ jsx("p", { className: "text-[11px] font-black uppercase tracking-[0.2em] text-slate-400", children: "Trip Snapshot" }),
            /* @__PURE__ */ jsxs("div", { className: "mt-4 grid gap-4 md:grid-cols-2", children: [
              /* @__PURE__ */ jsxs("div", { className: "rounded-2xl bg-slate-50 px-4 py-4", children: [
                /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 text-slate-500", children: [
                  /* @__PURE__ */ jsx(CalendarDays, { size: 15 }),
                  /* @__PURE__ */ jsx("span", { className: "text-xs font-bold uppercase tracking-wide", children: "Pickup" })
                ] }),
                /* @__PURE__ */ jsx("p", { className: "mt-3 text-sm font-black text-slate-900", children: formatDateTime(selectedRequest.pickupDateTime) })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "rounded-2xl bg-slate-50 px-4 py-4", children: [
                /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 text-slate-500", children: [
                  /* @__PURE__ */ jsx(Clock3, { size: 15 }),
                  /* @__PURE__ */ jsx("span", { className: "text-xs font-bold uppercase tracking-wide", children: "Return" })
                ] }),
                /* @__PURE__ */ jsx("p", { className: "mt-3 text-sm font-black text-slate-900", children: formatDateTime(selectedRequest.returnDateTime) }),
                /* @__PURE__ */ jsxs("p", { className: "mt-1 text-xs font-semibold text-slate-400", children: [
                  Number(selectedRequest.requestedHours || 0),
                  " hours requested"
                ] })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "rounded-2xl bg-slate-50 px-4 py-4 md:col-span-2", children: [
                /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 text-slate-500", children: [
                  /* @__PURE__ */ jsx(MapPin, { size: 15 }),
                  /* @__PURE__ */ jsx("span", { className: "text-xs font-bold uppercase tracking-wide", children: "Service Location" })
                ] }),
                /* @__PURE__ */ jsx("p", { className: "mt-3 text-sm font-black text-slate-900", children: selectedRequest.serviceLocation?.name || "Not selected" }),
                /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm font-semibold text-slate-500", children: selectedRequest.serviceLocation?.address || selectedRequest.serviceLocation?.city || "No address added" }),
                selectedRequest.serviceLocation?.distanceKm !== null && selectedRequest.serviceLocation?.distanceKm !== void 0 ? /* @__PURE__ */ jsxs("p", { className: "mt-1 text-xs font-semibold text-slate-400", children: [
                  "Approx. ",
                  Number(selectedRequest.serviceLocation.distanceKm).toFixed(1),
                  " km from rider"
                ] }) : null
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "rounded-[24px] border border-slate-200 bg-white p-5", children: [
            /* @__PURE__ */ jsx("p", { className: "text-[11px] font-black uppercase tracking-[0.2em] text-slate-400", children: "Booking Summary" }),
            /* @__PURE__ */ jsxs("div", { className: "mt-4 grid gap-4 md:grid-cols-2", children: [
              /* @__PURE__ */ jsxs("div", { className: "rounded-2xl bg-slate-50 px-4 py-4", children: [
                /* @__PURE__ */ jsx("p", { className: "text-xs font-bold uppercase tracking-wide text-slate-500", children: "Vehicle" }),
                /* @__PURE__ */ jsx("p", { className: "mt-3 text-sm font-black text-slate-900", children: selectedRequest.vehicleName || "Rental vehicle" }),
                /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm font-semibold text-slate-500", children: selectedRequest.vehicleCategory || "Rental" })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "rounded-2xl bg-slate-50 px-4 py-4", children: [
                /* @__PURE__ */ jsx("p", { className: "text-xs font-bold uppercase tracking-wide text-slate-500", children: "Package" }),
                /* @__PURE__ */ jsx("p", { className: "mt-3 text-sm font-black text-slate-900", children: selectedRequest.selectedPackage?.label || "Standard rental" }),
                /* @__PURE__ */ jsxs("p", { className: "mt-1 text-sm font-semibold text-slate-500", children: [
                  formatAmount(selectedRequest.selectedPackage?.price),
                  " \xB7 ",
                  Number(selectedRequest.selectedPackage?.durationHours || 0),
                  " hours"
                ] })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "rounded-2xl bg-slate-50 px-4 py-4", children: [
                /* @__PURE__ */ jsx("p", { className: "text-xs font-bold uppercase tracking-wide text-slate-500", children: "Advance Now" }),
                /* @__PURE__ */ jsx("p", { className: "mt-3 text-lg font-black text-slate-900", children: formatAmount(selectedRequest.payableNow) })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "rounded-2xl bg-slate-50 px-4 py-4", children: [
                /* @__PURE__ */ jsx("p", { className: "text-xs font-bold uppercase tracking-wide text-slate-500", children: "Rental Total" }),
                /* @__PURE__ */ jsx("p", { className: "mt-3 text-lg font-black text-slate-900", children: formatAmount(selectedRequest.totalCost) })
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsx(LiveBilling, { request: selectedRequest, loadedAt })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "space-y-5", children: [
          /* @__PURE__ */ jsxs("div", { className: "rounded-[24px] border border-slate-200 bg-slate-50/70 p-5", children: [
            /* @__PURE__ */ jsx("p", { className: "text-[11px] font-black uppercase tracking-[0.2em] text-slate-400", children: "Request Status" }),
            /* @__PURE__ */ jsxs("div", { className: "mt-4 space-y-4", children: [
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx("label", { className: "mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500", children: "Booking Status" }),
                /* @__PURE__ */ jsx(
                  "select",
                  {
                    value: selectedRequest.status,
                    onChange: (event) => updateLocal(selectedRequest.id || selectedRequest._id, { status: event.target.value }),
                    className: inputClass,
                    children: bookingStatusOptions.map((option) => /* @__PURE__ */ jsx("option", { value: option.value, children: option.label }, option.value))
                  }
                )
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap gap-2", children: [
                /* @__PURE__ */ jsx("span", { className: `inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-wide ${statusClasses[selectedRequest.status] || statusClasses.pending}`, children: selectedRequest.status }),
                /* @__PURE__ */ jsx("span", { className: `inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-wide ${paymentStatusClasses[selectedRequest.paymentStatus] || paymentStatusClasses.pending}`, children: selectedRequest.paymentStatus })
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "rounded-[24px] border border-slate-200 bg-slate-50/70 p-5", children: [
            /* @__PURE__ */ jsx("p", { className: "text-[11px] font-black uppercase tracking-[0.2em] text-slate-400", children: "Admin Notes" }),
            /* @__PURE__ */ jsx(
              "textarea",
              {
                rows: "8",
                value: selectedRequest.adminNote || "",
                onChange: (event) => updateLocal(selectedRequest.id || selectedRequest._id, { adminNote: event.target.value }),
                className: `${inputClass} mt-4`,
                placeholder: "Add internal handling notes for this rental request"
              }
            ),
            /* @__PURE__ */ jsx(
              "button",
              {
                type: "button",
                onClick: saveRequest,
                disabled: savingId === String(selectedRequest.id || selectedRequest._id),
                className: "mt-4 w-full rounded-xl bg-[#2e3c78] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#24305f] disabled:opacity-60",
                children: savingId === String(selectedRequest.id || selectedRequest._id) ? "Saving..." : "Save Changes"
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "rounded-[24px] border border-slate-200 bg-slate-50/70 p-5", children: [
            /* @__PURE__ */ jsx("p", { className: "text-[11px] font-black uppercase tracking-[0.2em] text-slate-400", children: "Quick Meta" }),
            /* @__PURE__ */ jsxs("div", { className: "mt-4 space-y-3 text-sm font-semibold text-slate-500", children: [
              /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
                /* @__PURE__ */ jsx(Phone, { size: 14, className: "text-slate-400" }),
                /* @__PURE__ */ jsx("span", { children: selectedRequest.userId?.phone || selectedRequest.contactPhone || "No phone" })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
                /* @__PURE__ */ jsx(ShieldCheck, { size: 14, className: "text-slate-400" }),
                /* @__PURE__ */ jsx("span", { children: selectedRequest.kycCompleted ? "KYC submitted in booking flow" : "KYC not confirmed" })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
                /* @__PURE__ */ jsx(CalendarDays, { size: 14, className: "text-slate-400" }),
                /* @__PURE__ */ jsxs("span", { children: [
                  "Created: ",
                  formatDateTime(selectedRequest.createdAt)
                ] })
              ] }),
              selectedRequest.reviewedAt ? /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
                /* @__PURE__ */ jsx(Clock3, { size: 14, className: "text-slate-400" }),
                /* @__PURE__ */ jsxs("span", { children: [
                  "Reviewed: ",
                  formatDateTime(selectedRequest.reviewedAt)
                ] })
              ] }) : null
            ] })
          ] })
        ] })
      ] }) })
    ] }) }) : null
  ] });
};
export default RentalBookingRequests;
