"use client";

import Link from "next/link";
import { useState, useMemo, useEffect, Suspense } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useParams } from "next/navigation";
import {
  History,
  ArrowLeft,
  Search,
  AlertTriangle,
  Flame,
  Filter,
  X,
  FileSpreadsheet,
} from "lucide-react";
import { getHostToken } from "../../../../lib/tokens";

function formatSeconds(sec?: number): string {
  if (typeof sec !== "number" || isNaN(sec)) return "—";
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${s}s`;
}

function HistoryContent() {
  const params = useParams<{ roomId: string }>();
  const roomId = params?.roomId as any;

  const [hostToken, setHostToken] = useState("");
  const [hasCheckedToken, setHasCheckedToken] = useState(false);

  // Filters
  const [selectedMusician, setSelectedMusician] = useState<string>("all");
  const [selectedInstrument, setSelectedInstrument] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<string>("all"); // "all" or "YYYY-MM-DD"
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (roomId) {
      const token = getHostToken(roomId);
      if (token) {
        setHostToken(token);
      }
      setHasCheckedToken(true);
    }
  }, [roomId]);

  const room = useQuery(
    api.rooms.getHostRoom,
    hostToken ? { roomId, hostToken } : "skip"
  );

  const history = useQuery(
    api.requests.listRoomRequestHistory,
    hostToken ? { roomId, hostToken } : "skip"
  );

  const records = useMemo(() => history || [], [history]);

  // Unique Musicians
  const musicians = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => {
      if (r.musicianName) set.add(r.musicianName);
    });
    return Array.from(set).sort();
  }, [records]);

  // Unique Instruments
  const instruments = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => {
      if (r.instrument) set.add(r.instrument);
    });
    return Array.from(set).sort();
  }, [records]);

  // Unique Dates
  const dates = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => {
      const d = new Date(r.createdAt).toISOString().split("T")[0];
      set.add(d);
    });
    return Array.from(set).sort().reverse();
  }, [records]);

  // Filtered records
  const filtered = useMemo(() => {
    return records.filter((r) => {
      if (selectedMusician !== "all" && r.musicianName !== selectedMusician) return false;
      if (selectedInstrument !== "all" && r.instrument !== selectedInstrument) return false;
      if (selectedStatus !== "all" && r.status !== selectedStatus) return false;
      if (selectedDate !== "all") {
        const itemDate = new Date(r.createdAt).toISOString().split("T")[0];
        if (itemDate !== selectedDate) return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const match =
          r.musicianName.toLowerCase().includes(query) ||
          r.instrument.toLowerCase().includes(query) ||
          r.category.toLowerCase().includes(query) ||
          r.message.toLowerCase().includes(query);
        if (!match) return false;
      }
      return true;
    });
  }, [records, selectedMusician, selectedInstrument, selectedStatus, selectedDate, searchQuery]);

  // Metrics
  const total = records.length;
  const urgentCount = records.filter((r) => r.priority === "urgent").length;
  const resolved = records.filter((r) => r.status === "resolved");

  // Time to Acknowledge metric
  const avgAckDurationSeconds = useMemo(() => {
    const withAck = records.filter((r) => typeof (r as any).ackDurationSeconds === "number");
    if (withAck.length === 0) return 0;
    const sum = withAck.reduce((acc, curr: any) => acc + (curr.ackDurationSeconds || 0), 0);
    return Math.round(sum / withAck.length);
  }, [records]);

  // Time to Resolve metric
  const avgResolveDurationSeconds = useMemo(() => {
    const withDuration = resolved.filter((r) => typeof r.durationSeconds === "number");
    if (withDuration.length === 0) return 0;
    const sum = withDuration.reduce((acc, curr) => acc + (curr.durationSeconds || 0), 0);
    return Math.round(sum / withDuration.length);
  }, [resolved]);

  function exportCSV() {
    if (records.length === 0) return;
    const headers = [
      "Musician",
      "Instrument",
      "Category",
      "Message",
      "Priority",
      "Status",
      "Submitted At (ISO)",
      "Submitted At (Local)",
      "Acknowledged At",
      "Resolved At",
      "Time to Acknowledge (s)",
      "Time to Resolve (s)",
    ];

    const rows = filtered.map((r: any) => [
      `"${r.musicianName.replace(/"/g, '""')}"`,
      `"${r.instrument.replace(/"/g, '""')}"`,
      `"${r.category.replace(/"/g, '""')}"`,
      `"${r.message.replace(/"/g, '""')}"`,
      `"${r.priority}"`,
      `"${r.status}"`,
      `"${new Date(r.createdAt).toISOString()}"`,
      `"${new Date(r.createdAt).toLocaleString()}"`,
      `"${r.acknowledgedAt ? new Date(r.acknowledgedAt).toISOString() : ""}"`,
      `"${r.resolvedAt ? new Date(r.resolvedAt).toISOString() : ""}"`,
      typeof r.ackDurationSeconds === "number" ? r.ackDurationSeconds : "",
      typeof r.durationSeconds === "number" ? r.durationSeconds : "",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const roomCode = room?.code || "STAGE";
    link.setAttribute("download", `StageSignal-History-${roomCode}-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const hasActiveFilters =
    selectedMusician !== "all" ||
    selectedInstrument !== "all" ||
    selectedStatus !== "all" ||
    selectedDate !== "all" ||
    Boolean(searchQuery.trim());

  function resetFilters() {
    setSelectedMusician("all");
    setSelectedInstrument("all");
    setSelectedStatus("all");
    setSelectedDate("all");
    setSearchQuery("");
  }

  if (!hasCheckedToken || (hostToken && room === undefined)) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#000000] bg-arounda-glow bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:32px_32px] text-white px-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FC3B00]/15 to-[#FF6129]/15 text-[#FF6129] border border-orange-500/30 shadow-lg shadow-orange-500/10">
            <History size={24} className="animate-spin text-[#FF6129]" />
          </div>
          <h2 className="text-lg font-bold">Verifying FOH Session...</h2>
          <p className="text-xs text-stone-500 font-mono">Loading service history</p>
        </div>
      </main>
    );
  }

  if (!hostToken || !room) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#000000] bg-arounda-glow bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:32px_32px] p-5 text-white">
        <div className="w-full max-w-md rounded-2xl border border border-white/10 bg-black/50 backdrop-blur-xl p-8 text-center shadow-xl rounded-3xl">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-[#FC3B00] border border-red-200">
            <AlertTriangle size={32} />
          </div>
          <h1 className="text-2xl font-extrabold text-white">Host Session Required</h1>
          <p className="mt-2 text-sm text-stone-400 leading-relaxed">
            Only the authorized FOH sound engineer can view the service audit log and debrief history.
          </p>
          <div className="mt-6 flex flex-col gap-2.5">
            <Link
              href="/"
              className="rounded-xl bg-gradient-to-r from-[#FC3B00] to-[#FF6129] px-5 py-3 text-sm font-bold text-white shadow-md shadow-[#FC3B00]/20 hover:from-[#E03500] hover:to-[#F2551D] transition"
            >
              Return Home
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[#000000] bg-arounda-glow text-white px-4 py-6 sm:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Top Header & Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <Link
              href={`/room/${roomId}/foh`}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-stone-400 hover:border-orange-500/40 hover:text-white transition"
              title="Return to FOH Console"
            >
              <ArrowLeft size={18} />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-widest text-[#FF6129] flex items-center gap-1.5">
                  <History size={14} /> Service Audit &amp; Debrief
                </span>
                <span className="rounded-md border border-orange-500/20 bg-white/[0.04] px-2 py-0.5 text-[10px] font-mono text-[#FF6129]">
                  {room.code}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                {room.name}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={exportCSV}
              disabled={filtered.length === 0}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#FC3B00] to-[#FF6129] px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-[#FC3B00]/20 hover:from-[#E03500] hover:to-[#F2551D] transition disabled:opacity-40 min-h-[44px]"
            >
              <FileSpreadsheet size={16} />
              <span>Export CSV ({filtered.length})</span>
            </button>
          </div>
        </div>

        {/* 5-Card Operational Metrics Overview */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <div className="rounded-xl border border-white/10 bg-black/50 backdrop-blur-xl p-4 shadow-sm">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
              Total Requests
            </span>
            <div className="mt-1 text-2xl sm:text-3xl font-extrabold text-white font-mono">
              {total}
            </div>
            <span className="text-[10px] text-stone-400">Service lifetime</span>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/50 backdrop-blur-xl p-4 shadow-sm">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
              Resolved
            </span>
            <div className="mt-1 text-2xl sm:text-3xl font-extrabold text-emerald-400 font-mono">
              {resolved.length}
            </div>
            <span className="text-[10px] text-stone-400">
              {total > 0 ? Math.round((resolved.length / total) * 100) : 0}% completion
            </span>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/50 backdrop-blur-xl p-4 shadow-sm">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
              Urgent SOS
            </span>
            <div className="mt-1 text-2xl sm:text-3xl font-extrabold text-[#FF6B81] font-mono">
              {urgentCount}
            </div>
            <span className="text-[10px] text-stone-400">Emergency cues</span>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/50 backdrop-blur-xl p-4 shadow-sm">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
              Avg Acknowledge
            </span>
            <div className="mt-1 text-2xl sm:text-3xl font-extrabold text-[#FF6129] font-mono">
              {formatSeconds(avgAckDurationSeconds)}
            </div>
            <span className="text-[10px] text-stone-400">FOH reaction time</span>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/50 backdrop-blur-xl p-4 shadow-sm col-span-2 sm:col-span-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
              Avg Resolution
            </span>
            <div className="mt-1 text-2xl sm:text-3xl font-extrabold text-amber-400 font-mono">
              {formatSeconds(avgResolveDurationSeconds)}
            </div>
            <span className="text-[10px] text-stone-400">Total mix fix time</span>
          </div>
        </div>

        {/* Multi-Parameter Filters: Musician, Instrument, Status, Date, Text Search */}
        <div className="rounded-2xl border border-white/10 bg-black/50 backdrop-blur-xl p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-stone-500">
              <Filter size={14} className="text-[#FF6129]" />
              <span>Filter Service History</span>
            </div>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="text-xs text-[#FF6129] hover:text-white flex items-center gap-1 font-semibold"
              >
                <X size={13} /> Reset Filters
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
            {/* Search */}
            <div className="relative lg:col-span-1">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search text..."
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2 pl-8 pr-3 text-xs text-white placeholder-slate-500 focus:border-orange-500 focus:outline-none"
              />
            </div>

            {/* Musician Filter */}
            <div>
              <select
                value={selectedMusician}
                onChange={(e) => setSelectedMusician(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white focus:border-orange-500 focus:outline-none"
              >
                <option value="all">All Musicians ({musicians.length})</option>
                {musicians.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            {/* Instrument Filter */}
            <div>
              <select
                value={selectedInstrument}
                onChange={(e) => setSelectedInstrument(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white focus:border-orange-500 focus:outline-none"
              >
                <option value="all">All Instruments ({instruments.length})</option>
                {instruments.map((i) => (
                  <option key={i} value={i}>
                    {i}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white focus:border-orange-500 focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="acknowledged">Acknowledged</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>

            {/* Date Filter */}
            <div>
              <select
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white focus:border-orange-500 focus:outline-none"
              >
                <option value="all">All Dates ({dates.length})</option>
                {dates.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* History Table */}
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/50 backdrop-blur-xl shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/10 bg-white/[0.06] uppercase tracking-wider text-stone-300 font-bold">
                <tr>
                  <th className="px-4 py-3.5">Musician</th>
                  <th className="px-4 py-3.5">Category</th>
                  <th className="px-4 py-3.5">Message</th>
                  <th className="px-4 py-3.5">Submitted</th>
                  <th className="px-4 py-3.5">Acknowledged</th>
                  <th className="px-4 py-3.5">Resolved</th>
                  <th className="px-4 py-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-stone-500">
                      No records match the selected filters.
                    </td>
                  </tr>
                ) : (
                  filtered.map((req: any) => {
                    const isUrgent = req.priority === "urgent";
                    return (
                      <tr key={req._id} className="hover:bg-white/[0.04] transition">
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="font-bold text-white flex items-center gap-1.5">
                            {isUrgent && <Flame size={13} className="text-[#FF6B81] shrink-0" />}
                            <span>{req.musicianName}</span>
                          </div>
                          <div className="text-[11px] text-stone-500 font-medium">
                            {req.instrument}
                          </div>
                        </td>

                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span
                            className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                              isUrgent
                                ? "bg-red-500/20 text-red-300 border border-red-500/30"
                                : "bg-orange-500/10 text-[#FF6129] border border-orange-500/20"
                            }`}
                          >
                            {req.category}
                          </span>
                        </td>

                        <td className="px-4 py-3.5 max-w-xs sm:max-w-md text-stone-100 font-medium leading-relaxed">
                          {req.message}
                        </td>

                        <td className="px-4 py-3.5 text-stone-500 font-mono whitespace-nowrap">
                          <div>
                            {new Date(req.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })}
                          </div>
                          <div className="text-[10px] text-stone-400">
                            {new Date(req.createdAt).toISOString().slice(0, 10)}
                          </div>
                        </td>

                        <td className="px-4 py-3.5 text-stone-500 font-mono whitespace-nowrap">
                          {req.acknowledgedAt ? (
                            <div>
                              <span className="text-[#FF6129]">
                                {new Date(req.acknowledgedAt).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  second: "2-digit",
                                })}
                              </span>
                              {typeof req.ackDurationSeconds === "number" && (
                                <div className="text-[10px] text-stone-400">
                                  +{req.ackDurationSeconds}s
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </td>

                        <td className="px-4 py-3.5 text-stone-500 font-mono whitespace-nowrap">
                          {req.resolvedAt ? (
                            <div>
                              <span className="text-emerald-400 font-semibold">
                                {new Date(req.resolvedAt).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  second: "2-digit",
                                })}
                              </span>
                              {typeof req.durationSeconds === "number" && (
                                <div className="text-[10px] text-emerald-400/80">
                                  {formatSeconds(req.durationSeconds)}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </td>

                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span
                            className={`inline-block rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase ${
                              req.status === "resolved"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                                : req.status === "acknowledged"
                                ? "bg-orange-500/10 text-[#FF6129] border border-orange-500/30"
                                : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                            }`}
                          >
                            {req.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HistoryPage() {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-screen place-items-center bg-[#000000] bg-arounda-glow text-white">
          <div className="text-center text-sm text-stone-500">Loading Service History...</div>
        </div>
      }
    >
      <HistoryContent />
    </Suspense>
  );
}
