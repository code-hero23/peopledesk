import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSelector, useDispatch } from "react-redux";
import {
  getPendingRequests,
  getRequestHistory,
  updateRequestStatus,
  deleteRequest,
  reset,
} from "../../features/admin/adminSlice";
import { Download, Calendar, X, AlertTriangle } from "lucide-react";
import MonthCycleSelector from "../../components/common/MonthCycleSelector";
import axios from "axios";
import { formatDate, formatDateTime } from "../../utils/dateUtils";

const Approvals = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { pendingRequests, requestHistory, isLoading, isError, message } =
    useSelector((state) => state.admin);
  const [activeTab, setActiveTab] = useState("pending"); // 'pending' or 'history'
  const [bhView, setBhView] = useState("mine"); // 'mine' or 'others' — Global BH only
  const [filterDate, setFilterDate] = useState(""); // Specific date if picked
  const [cycleRange, setCycleRange] = useState({ startDate: "", endDate: "" });
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedKeys, setSelectedKeys] = useState([]);
  const [typeFilter, setTypeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("requests"); // 'requests', 'direct'
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const handleCycleChange = (range) => {
    setCycleRange(range);
  };

  useEffect(() => {
    if (!filterDate && (!cycleRange.startDate || !cycleRange.endDate)) {
      return;
    }

    const params = filterDate
      ? { date: filterDate }
      : { startDate: cycleRange.startDate, endDate: cycleRange.endDate };

    if (activeTab === "pending") {
      dispatch(getPendingRequests(params));
    } else {
      dispatch(getRequestHistory(params));
    }

    return () => {
      dispatch(reset());
    };
  }, [dispatch, activeTab, filterDate, cycleRange]);

  const onUpdateStatus = (type, id, status) => {
    if (window.confirm(`Confirm ${status} action?`)) {
      dispatch(updateRequestStatus({ type, id, status }));
      setSelectedKeys((prev) => prev.filter((key) => key !== `${type}-${id}`));
    }
  };

  const onDelete = (type, id) => {
    if (
      window.confirm(
        "Are you sure you want to DELETE this request? This cannot be undone.",
      )
    ) {
      dispatch(deleteRequest({ type, id }));
      setSelectedKeys((prev) => prev.filter((key) => key !== `${type}-${id}`));
    }
  };

  const handleExport = async () => {
    try {
      const config = {
        headers: { Authorization: `Bearer ${user.token}` },
        responseType: "blob",
      };
      const baseUrl =
        import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";
      const response = await axios.get(`${baseUrl}/export/requests`, config);

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `requests_export_${new Date().toISOString().split("T")[0]}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error("Export failed:", error);
      alert("Failed to export requests.");
    }
  };

  const displayData =
    activeTab === "pending" ? pendingRequests : requestHistory;

  const canDelete = ["ADMIN", "HR"].includes(user?.role);
  const canApprove = ["HR", "BUSINESS_HEAD", "AE_MANAGER"].includes(user?.role);
  const isGlobalBH = user?.role === "BUSINESS_HEAD" && user?.isGlobalAccess;

  // For Global BH: split requests into Mine vs Others
  let leaves = displayData?.leaves || [];
  let permissions = displayData?.permissions || [];

  if (isGlobalBH && activeTab === "pending") {
    if (bhView === "mine") {
      leaves = leaves.filter(
        (r) => r.targetBhId === user.id || r.user?.reportingBhId === user.id,
      );
      permissions = permissions.filter(
        (r) => r.targetBhId === user.id || r.user?.reportingBhId === user.id,
      );
    } else {
      leaves = leaves.filter(
        (r) => r.targetBhId !== user.id && r.user?.reportingBhId !== user.id,
      );
      permissions = permissions.filter(
        (r) => r.targetBhId !== user.id && r.user?.reportingBhId !== user.id,
      );
    }
  }

  if (searchTerm) {
    const lowerTerm = searchTerm.toLowerCase();
    leaves = leaves.filter(
      (r) =>
        r.user?.name?.toLowerCase().includes(lowerTerm) ||
        r.user?.email?.toLowerCase().includes(lowerTerm),
    );
    permissions = permissions.filter(
      (r) =>
        r.user?.name?.toLowerCase().includes(lowerTerm) ||
        r.user?.email?.toLowerCase().includes(lowerTerm),
    );
  }

  const sortedRequests = [
    ...leaves.map((req) => ({
      req,
      type: "leave",
      label: "Leave Request",
      color: "orange",
    })),
    ...permissions.map((req) => ({
      req,
      type: "permission",
      label: "Permission",
      color: "purple",
    })),
  ].sort((a, b) => {
    return (
      new Date(b.req.createdAt).getTime() - new Date(a.req.createdAt).getTime()
    );
  });

  const filteredRequests = sortedRequests.filter(({ req, type }) => {
    if (typeFilter !== "all" && type !== typeFilter) return false;

    // A request is a Direct Update ONLY if it's within the limit AND already approved.
    // If it's pending, it's always an approval request.
    const isLeaveOrPerm = type === "leave" || type === "permission";
    const isDirectUpdate = isLeaveOrPerm && !req.isExceededLimit && req.status === "APPROVED";

    if (categoryFilter === "requests") {
      if (isDirectUpdate) return false;
    } else if (categoryFilter === "direct") {
      if (!isDirectUpdate) return false;
    }

    return true;
  });

  const totalItems = filteredRequests.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const paginatedRequests = filteredRequests.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Actionable requests for current page (to support Select All and select list filters)
  const actionablePageRequests = paginatedRequests.filter(({ req, type }) => {
    if (activeTab !== "pending" || !canApprove) return false;
    if (isGlobalBH && bhView === "others") return false;
    return (
      (user.role !== "BUSINESS_HEAD" && user.role !== "AE_MANAGER") ||
      req.targetBhId === user.id ||
      req.user.reportingBhId === user.id
    );
  });

  const toggleSelect = (type, id) => {
    const key = `${type}-${id}`;
    setSelectedKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleSelectAll = () => {
    const actionableKeys = actionablePageRequests.map(({ req, type }) => `${type}-${req.id}`);
    const allSelected = actionableKeys.every((key) => selectedKeys.includes(key));
    if (allSelected) {
      // Unselect all actionable page keys
      setSelectedKeys((prev) => prev.filter((key) => !actionableKeys.includes(key)));
    } else {
      // Select all actionable page keys
      setSelectedKeys((prev) => Array.from(new Set([...prev, ...actionableKeys])));
    }
  };

  const getPageNumbers = () => {
    const pages = [];
    const delta = 2; // numbers to show on each side of active page
    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 ||
        i === totalPages ||
        (i >= currentPage - delta && i <= currentPage + delta)
      ) {
        pages.push(i);
      } else if (pages[pages.length - 1] !== "...") {
        pages.push("...");
      }
    }
    return pages;
  };

  const handleBulkApprove = async () => {
    if (selectedKeys.length === 0) return;
    if (
      !window.confirm(
        `Are you sure you want to APPROVE all ${selectedKeys.length} selected request(s)?`
      )
    )
      return;
    selectedKeys.forEach((key) => {
      const [type, idStr] = key.split("-");
      const id = parseInt(idStr);
      dispatch(updateRequestStatus({ type, id, status: "APPROVED" }));
    });
    setSelectedKeys([]);
  };

  const handleBulkReject = async () => {
    if (selectedKeys.length === 0) return;
    if (
      !window.confirm(
        `Are you sure you want to REJECT all ${selectedKeys.length} selected request(s)?`
      )
    )
      return;
    selectedKeys.forEach((key) => {
      const [type, idStr] = key.split("-");
      const id = parseInt(idStr);
      dispatch(updateRequestStatus({ type, id, status: "REJECTED" }));
    });
    setSelectedKeys([]);
  };

  if (isLoading && activeTab === "pending" && !pendingRequests.leaves)
    return (
      <div className="p-8 text-center text-slate-500">Loading requests...</div>
    );

  if (isError) {
    return (
      <div className="p-8 text-center bg-red-50 text-red-600 rounded-xl border border-red-200">
        <p className="font-bold">Error loading requests</p>
        <p className="text-sm">{message}</p>
        <button
          onClick={() =>
            dispatch(
              activeTab === "pending"
                ? getPendingRequests(filterDate)
                : getRequestHistory(filterDate),
            )
          }
          className="mt-4 px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  const calculateDuration = (req) => {
    if (req.type === "HALF_DAY") return "Half Day ☀️";
    if (req.date) return "1 Day";
    if (req.startDate && req.endDate) {
      const start = new Date(req.startDate);
      const end = new Date(req.endDate);
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      return diffDays > 4 ? `${diffDays} Days (4+)` : `${diffDays} Days`;
    }
    return req.type;
  };

  const renderRequestCard = (req, type, typeLabel, color) => {
    const cardKey = `${type}-${req.id}`;
    const isSelected = selectedKeys.includes(cardKey);
    const isActionable = activeTab === "pending" && canApprove && (
      !isGlobalBH || bhView === "mine"
    ) && (
      (user.role !== "BUSINESS_HEAD" && user.role !== "AE_MANAGER") ||
      req.targetBhId === user.id ||
      req.user.reportingBhId === user.id
    );

    return (
      <div
        key={cardKey}
        onClick={() => isActionable && toggleSelect(type, req.id)}
        className={`bg-white p-6 rounded-xl shadow-sm border border-l-4 transition-shadow hover:shadow-md cursor-pointer select-none ${
          isActionable && isSelected
            ? "ring-2 ring-blue-500 border-l-blue-500"
            : req.status === "PENDING"
              ? `border-l-${color}-500 border-slate-200`
              : req.status === "APPROVED"
                ? "border-l-green-500 border-slate-200 opacity-90"
                : "border-l-red-500 border-slate-200 opacity-90"
        }`}
      >
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            {isActionable && (
              <input
                type="checkbox"
                checked={isSelected}
                onChange={(e) => {
                  e.stopPropagation();
                  toggleSelect(type, req.id);
                }}
                onClick={(e) => e.stopPropagation()}
                className="w-5 h-5 rounded border-slate-350 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
            )}
            <div>
              <h4 className="font-bold text-slate-800">{req.user.name}</h4>
              <span className="text-xs text-slate-500 uppercase tracking-wide">
                {typeLabel}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span
              className={`font-bold rounded-lg shadow-sm flex items-center gap-1
                           ${
                             type === "leave"
                               ? "text-sm px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white"
                               : type === "permission"
                                 ? "text-sm px-4 py-2 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white"
                                 : `text-xs px-2 py-1 ${
                                     req.status === "PENDING"
                                       ? `bg-${color}-100 text-${color}-700`
                                       : req.status === "APPROVED"
                                         ? "bg-green-100 text-green-700"
                                         : "bg-red-100 text-red-700"
                                   }`
                           }`}
            >
              {type === "leave" ? (
                <>
                  <span>🗓️</span>
                  {calculateDuration(req)}
                </>
              ) : type === "permission" ? (
                <>
                  <span>🕑</span>2 HRS
                </>
              ) : Object.keys(req).includes("sourceShowroom") ? (
                "Showroom Visit"
              ) : (
                "Site Visit"
              )}
              {activeTab === "history" &&
                type !== "leave" &&
                type !== "permission" &&
                ` (${req.status})`}
            </span>
            {canDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(type, req.id);
                }}
                className="text-xs text-red-500 hover:text-red-700 underline"
              >
                Delete
              </button>
            )}
          </div>
        </div>

        {/* Status Badges */}
        <div className="flex flex-wrap gap-2 mb-3">
          {(type === "leave" || type === "permission") && (
            (req.isExceededLimit || req.status === "PENDING") ? (
              <span className="text-white text-[10px] font-black px-2 py-1 rounded-full flex items-center gap-1 shadow-sm" style={{ backgroundColor: '#e11d48' }}>
                <AlertTriangle size={10} />
                Approval Request {(req.isExceededLimit || req.status === "PENDING") && "(Requires Approval)"}
              </span>
            ) : (
              <span className="text-white text-[10px] font-black px-2 py-1 rounded-full flex items-center gap-1 shadow-sm" style={{ backgroundColor: '#10b981' }}>
                ✨ Direct Update (Auto-Approved)
              </span>
            )
          )}
          {(type === "site-visit" || type === "showroom-visit") && (
            <span className="text-white text-[10px] font-black px-2 py-1 rounded-full flex items-center gap-1 shadow-sm" style={{ backgroundColor: '#2563eb' }}>
              📋 Approval Request
            </span>
          )}
          {req.bhStatus === "PENDING" && (
            <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full border border-yellow-200 flex items-center gap-1">
              ⏳ Waiting for {req.bhDesignation || "BH"}
            </span>
          )}
          {req.bhStatus === "APPROVED" && (
            <span className="bg-emerald-100 text-emerald-800 text-xs px-2 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
              ✅ Verified by {req.bhName || req.bhDesignation || "BH"}
            </span>
          )}
          {req.bhStatus === "REJECTED" && (
            <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full border border-red-200 flex items-center gap-1">
              ❌ Rejected by {req.bhName || req.bhDesignation || "BH"}
            </span>
          )}
        </div>

        <div className="space-y-2 mb-6">
          <p className="text-sm text-slate-600 flex items-center gap-2">
            <span>🗓️</span>
            {req.date
              ? formatDate(req.date)
              : `${formatDate(req.startDate)} - ${formatDate(req.endDate)}`}
            {req.startTime &&
              req.endTime &&
              ` (${req.startTime} - ${req.endTime})`}
          </p>
          {req.location && (
            <p className="text-sm text-slate-600">
              📍 {req.location} ({req.projectName})
            </p>
          )}
          {req.sourceShowroom && (
            <p className="text-sm text-slate-600">
              🚚 {req.sourceShowroom} ➡️ {req.destinationShowroom}
            </p>
          )}

          <div className="mt-3 bg-blue-50/50 p-3 rounded-md border-l-4 border-blue-500">
            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block mb-0.5">
              Reason
            </span>
            <p className="text-sm font-bold text-slate-800 italic">
              "{req.reason}"
            </p>
          </div>

          <div className="flex justify-between items-center text-xs font-semibold text-slate-500 mt-2 border-t border-slate-100 pt-2 bg-slate-50/50 -mx-6 px-6 -mb-6 pb-4 rounded-b-xl">
            <span className="flex items-center gap-1">
              Applied:{" "}
              <span className="text-slate-700">
                {formatDateTime(req.createdAt)}
              </span>
            </span>
            {activeTab === "history" && (
              <span>
                Updated: {formatDateTime(req.updatedAt || req.createdAt)}
              </span>
            )}
          </div>
        </div>
        {activeTab === "pending" && canApprove && (
          <div className="grid grid-cols-2 gap-3">
            {isGlobalBH && bhView === "others" ? (
              <div className="col-span-2 py-2.5 bg-amber-50 rounded-lg text-center text-amber-600 text-[10px] font-bold border border-amber-100 uppercase tracking-widest">
                🌐 Monitoring — Other {req.bhDesignation || "BH"}'s Approval
              </div>
            ) : (user.role !== "BUSINESS_HEAD" && user.role !== "AE_MANAGER") ||
              req.targetBhId === user.id ||
              req.user.reportingBhId === user.id ? (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdateStatus(type, req.id, "APPROVED");
                  }}
                  className="w-full py-2 rounded-lg bg-green-50 hover:bg-green-100 text-green-700 font-bold text-sm transition-colors"
                >
                  Approve
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdateStatus(type, req.id, "REJECTED");
                  }}
                  className="w-full py-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 font-bold text-sm transition-colors"
                >
                  Reject
                </button>
              </>
            ) : (
              <div className="col-span-2 py-2.5 bg-slate-50 rounded-lg text-center text-slate-400 text-[10px] font-bold border border-slate-100 uppercase tracking-widest">
                👁️ Monitoring Only
              </div>
            )}
          </div>
        )}
        {activeTab === "pending" && !canApprove && (
          <div className="py-2.5 bg-slate-50 rounded-lg text-center text-slate-400 text-[10px] font-bold border border-slate-100 uppercase tracking-widest">
            👁️ Monitoring View (Authorization Required)
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header Row */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Approvals</h2>
          <p className="text-slate-500 mt-1">Manage all employee requests.</p>
        </div>
        <div className="w-full md:w-auto">
          <MonthCycleSelector onCycleChange={handleCycleChange} />
        </div>
      </div>

      {/* Controls Container */}
      <div className="space-y-4">
        {/* Actions Row */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleExport}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium shadow-md transition-colors flex items-center gap-2 text-sm"
          >
            <Download size={18} /> Export Requests
          </button>

          {activeTab === "pending" && canApprove && actionablePageRequests.length > 0 && (
            <button
              onClick={handleSelectAll}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-750 px-4 py-2 rounded-lg font-bold text-sm transition-all"
            >
              {actionablePageRequests.every(r => selectedKeys.includes(`${r.type}-${r.req.id}`)) 
                ? "Deselect All" 
                : "Select All"
              }
            </button>
          )}

          {selectedKeys.length > 0 && (
            <>
              <button
                onClick={handleBulkApprove}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold shadow-md transition-colors text-sm"
              >
                Approve Selected ({selectedKeys.length})
              </button>
              <button
                onClick={handleBulkReject}
                className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg font-bold shadow-md transition-colors text-sm"
              >
                Reject Selected ({selectedKeys.length})
              </button>
            </>
          )}
        </div>

        {/* Search, Dates & Tabs Row */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
          <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0">
            {/* Search Bar */}
            <div className="relative w-full sm:w-64">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-slate-400">🔍</span>
              </div>
              <input
                type="text"
                placeholder="Search employee..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-750 dark:text-slate-300 font-medium bg-white dark:bg-slate-900"
              />
            </div>

            {/* Today and pick date inputs */}
            <div className="relative flex items-center group gap-2">
              <motion.button
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.98 }}
                onClick={() =>
                  setFilterDate(new Date().toISOString().split("T")[0])
                }
                className="h-10 px-5 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-xl font-bold text-xs shadow-[0_4px_15px_-3px_rgba(59,130,246,0.4)] hover:shadow-[0_8px_20px_-4px_rgba(59,130,246,0.5)] transition-all flex items-center gap-2 whitespace-nowrap border border-white/10"
              >
                <Calendar size={14} strokeWidth={2.5} />
                TODAY
              </motion.button>

              <div className="relative flex items-center group">
                <div className="absolute left-3.5 text-slate-400 group-focus-within:text-blue-500 transition-all duration-300 transform group-hover:scale-110">
                  <Calendar size={18} strokeWidth={2.5} />
                </div>
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="bg-white dark:bg-slate-900 backdrop-blur-sm pl-11 pr-10 py-2.5 border border-slate-200 dark:border-slate-800 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 text-slate-700 dark:text-slate-300 font-bold text-sm shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_4px_6px_-2px_rgba(0,0,0,0.02)] transition-all duration-300 hover:border-blue-300 w-[190px] appearance-none"
                />
                {filterDate ? (
                  <button
                    onClick={() => setFilterDate("")}
                    className="absolute right-3 p-1.5 rounded-xl bg-slate-100/50 hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all duration-300 hover:rotate-90"
                    title="Clear filter"
                  >
                    <X size={14} strokeWidth={3} />
                  </button>
                ) : (
                  <div className="absolute right-4 text-[10px] font-black text-slate-300 uppercase tracking-tighter pointer-events-none group-focus-within:opacity-0 transition-opacity">
                    DATE
                  </div>
                )}
              </div>
            </div>

            {/* Type Toggle Filters */}
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 shadow-sm">
              <span className="text-[10px] font-black text-slate-400 dark:text-slate-550 uppercase tracking-wider">Type:</span>
              {[
                { value: "all", label: "All" },
                { value: "leave", label: "Leaves" },
                { value: "permission", label: "Permissions" }
              ].map((opt) => (
                <button
                  key={opt.label}
                  onClick={() => {
                    setTypeFilter(opt.value);
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                    typeFilter === opt.value
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-slate-500 hover:text-slate-850 dark:text-slate-400 dark:hover:text-slate-250"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Category Toggle Filters */}
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 shadow-sm">
              <span className="text-[10px] font-black text-slate-400 dark:text-slate-550 uppercase tracking-wider">Category:</span>
              {[
                { value: "requests", label: "Approval Requests" },
                { value: "direct", label: "Direct Updates" }
              ].map((opt) => (
                <button
                  key={opt.label}
                  onClick={() => {
                    setCategoryFilter(opt.value);
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                    categoryFilter === opt.value
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-500 hover:text-slate-850 dark:text-slate-400 dark:hover:text-slate-250"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex bg-white dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-800">
            <button
              onClick={() => {
                setActiveTab("pending");
                setSelectedKeys([]);
                setCurrentPage(1);
              }}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === "pending"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-655 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              Pending
            </button>
            <button
              onClick={() => {
                setActiveTab("history");
                setSelectedKeys([]);
                setCurrentPage(1);
              }}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === "history"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-655 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              History
            </button>
          </div>
        </div>
      </div>

      {/* Global BH tabs */}
      {isGlobalBH && activeTab === "pending" && (
        <div className="col-span-full">
          <div className="flex gap-2 bg-white border border-slate-200 rounded-xl p-1.5 w-fit shadow-sm">
            <button
              onClick={() => {
                setBhView("mine");
                setSelectedKeys([]);
              }}
              className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${
                bhView === "mine"
                  ? "bg-blue-600 text-white shadow-md"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
              }`}
            >
              ✅ My Approvals
            </button>

            <button
              onClick={() => {
                setBhView("others");
                setSelectedKeys([]);
              }}
              className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${
                bhView === "others"
                  ? "bg-amber-500 text-white shadow-md"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
              }`}
            >
              🌐 Other BH Approvals
            </button>
          </div>

          {bhView === "others" && (
            <p className="mt-2 text-xs text-amber-600 font-semibold">
              🔒 Monitoring only — you cannot approve requests assigned to other Business Heads.
            </p>
          )}
        </div>
      )}

      {/* Request Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {paginatedRequests.map(({ req, type, label, color }) =>
          renderRequestCard(req, type, label, color)
        )}

        {paginatedRequests.length === 0 && (
          <div className="col-span-full border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center bg-slate-50 dark:bg-slate-900/50">
            <p className="text-slate-400 dark:text-slate-500 font-medium">
              {isGlobalBH && activeTab === "pending" && bhView === "mine"
                ? "✨ No pending requests assigned to you."
                : isGlobalBH && activeTab === "pending" && bhView === "others"
                  ? "✨ No pending requests for other Business Heads."
                  : `✨ No ${activeTab} requests found.`}
            </p>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 pt-6">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-300"
          >
            Previous
          </button>
          
          <div className="flex items-center gap-1.5">
            {getPageNumbers().map((page, idx) => {
              if (page === "...") {
                return (
                  <span key={`dots-${idx}`} className="px-2 text-slate-400 dark:text-slate-500 font-bold select-none">
                    ...
                  </span>
                );
              }
              return (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-8 h-8 rounded-xl text-xs font-bold transition-all ${
                    currentPage === page
                      ? "bg-blue-600 text-white shadow-md font-black"
                      : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  {page}
                </button>
              );
            })}
          </div>

          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-300"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default Approvals;
