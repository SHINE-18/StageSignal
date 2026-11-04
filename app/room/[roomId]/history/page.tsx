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
      <main className="grid min-h-screen place-items-center bg-[#090d18] text-[#f8fafc] px-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-400 border border-blue-500/30">
            <History size={24} className="animate-spin" />
          </div>
          <h2 className="text-lg font-bold">Verifying FOH Session...</h2>
          <p className="text-xs text-slate-400 font-mono">Loading service history</p>
        </div>
      </main>
    );
  }

  if (!hostToken || !room) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#090d18] p-5 text-[#f8fafc]">
        <div className="w-full max-w-md rounded-2xl border border-red-500/30 bg-[#111827] p-8 text-center shadow-2xl">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-950/60 text-red-400 border border-red-500/30">
            <AlertTriangle size={32} />
          </div>
          <h1 className="text-2xl font-extrabold text-white">Host Session Required</h1>
          <p className="mt-2 text-sm text-slate-300 leading-relaxed">
            Only the authorized FOH sound engineer can view the service audit log and debrief history.
          </p>
          <div className="mt-6 flex flex-col gap-2.5">
            <Link
              href="/"
              className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-500 transition"
            >
              Return Home
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[#090d18] text-[#f8fafc] px-4 py-6 sm:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Top Header & Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <Link
              href={`/room/${roomId}/foh`}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-[#151d2d] text-slate-300 hover:bg-white/10 hover:text-white transition"
              title="Return to FOH Console"
            >
              <ArrowLeft size={18} />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-widest text-blue-400 flex items-center gap-1.5">
                  <History size={14} /> Service Audit &amp; Debrief
                </span>
                <span className="rounded-md border border-white/10 bg-[#151d2d] px-2 py-0.5 text-[10px] font-mono text-slate-400">
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
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-500/20 hover:bg-blue-500 transition disabled:opacity-40 min-h-[44px]"
            >
              <FileSpreadsheet size={16} />
              <span>Export CSV ({filtered.length})</span>
            </button>
          </div>
        </div>

        {/* 5-Card Operational Metrics Overview */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <div className="rounded-xl border border-white/10 bg-[#111827] p-4 shadow-sm">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Total Requests
            </span>
            <div className="mt-1 text-2xl sm:text-3xl font-extrabold text-white font-mono">
              {total}
            </div>
            <span className="text-[10px] text-slate-500">Service lifetime</span>
          </div>

          <div className="rounded-xl border border-white/10 bg-[#111827] p-4 shadow-sm">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Resolved
            </span>
            <div className="mt-1 text-2xl sm:text-3xl font-extrabold text-emerald-400 font-mono">
              {resolved.length}
            </div>
            <span className="text-[10px] text-slate-500">
              {total > 0 ? Math.round((resolved.length / total) * 100) : 0}% completion
            </span>
          </div>

          <div className="rounded-xl border border-white/10 bg-[#111827] p-4 shadow-sm">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Urgent SOS
            </span>
            <div className="mt-1 text-2xl sm:text-3xl font-extrabold text-red-400 font-mono">
              {urgentCount}
            </div>
            <span className="text-[10px] text-slate-500">Emergency cues</span>
          </div>

          <div className="rounded-xl border border-white/10 bg-[#111827] p-4 shadow-sm">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Avg Acknowledge
            </span>
            <div className="mt-1 text-2xl sm:text-3xl font-extrabold text-blue-400 font-mono">
              {formatSeconds(avgAckDurationSeconds)}
            </div>
            <span className="text-[10px] text-slate-500">FOH reaction time</span>
          </div>

          <div className="rounded-xl border border-white/10 bg-[#111827] p-4 shadow-sm col-span-2 sm:col-span-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Avg Resolution
            </span>
            <div className="mt-1 text-2xl sm:text-3xl font-extrabold text-amber-400 font-mono">
              {formatSeconds(avgResolveDurationSeconds)}
            </div>
            <span className="text-[10px] text-slate-500">Total mix fix time</span>
          </div>
        </div>

        {/* Multi-Parameter Filters: Musician, Instrument, Status, Date, Text Search */}
        <div className="rounded-2xl border border-white/10 bg-[#111827] p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              <Filter size={14} className="text-blue-400" />
              <span>Filter Service History</span>
            </div>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="text-xs text-blue-400 hover:text-white flex items-center gap-1 font-semibold"
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
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search text..."
                className="w-full rounded-xl border border-white/10 bg-[#151d2d] py-2 pl-8 pr-3 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* Musician Filter */}
            <div>
              <select
                value={selectedMusician}
                onChange={(e) => setSelectedMusician(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#151d2d] px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
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
                className="w-full rounded-xl border border-white/10 bg-[#151d2d] px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
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
                className="w-full rounded-xl border border-white/10 bg-[#151d2d] px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
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
                className="w-full rounded-xl border border-white/10 bg-[#151d2d] px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
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
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#111827] shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/10 bg-[#151d2d] uppercase tracking-wider text-slate-400 font-bold">
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
                    <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                      No records match the selected filters.
                    </td>
                  </tr>
                ) : (
                  filtered.map((req: any) => {
                    const isUrgent = req.priority === "urgent";
                    return (
                      <tr key={req._id} className="hover:bg-white/5 transition">
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="font-bold text-white flex items-center gap-1.5">
                            {isUrgent && <Flame size={13} className="text-red-400 shrink-0" />}
                            <span>{req.musicianName}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 font-medium">
                            {req.instrument}
                          </div>
                        </td>

                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span
                            className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                              isUrgent
                                ? "bg-red-500/20 text-red-300 border border-red-500/30"
                                : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                            }`}
                          >
                            {req.category}
                          </span>
                        </td>

                        <td className="px-4 py-3.5 max-w-xs sm:max-w-md text-slate-200 font-medium leading-relaxed">
                          {req.message}
                        </td>

                        <td className="px-4 py-3.5 text-slate-400 font-mono whitespace-nowrap">
                          <div>
                            {new Date(req.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {new Date(req.createdAt).toISOString().slice(0, 10)}
                          </div>
                        </td>

                        <td className="px-4 py-3.5 text-slate-400 font-mono whitespace-nowrap">
                          {req.acknowledgedAt ? (
                            <div>
                              <span className="text-blue-300">
                                {new Date(req.acknowledgedAt).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  second: "2-digit",
                                })}
                              </span>
                              {typeof req.ackDurationSeconds === "number" && (
                                <div className="text-[10px] text-slate-500">
                                  +{req.ackDurationSeconds}s
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </td>

                        <td className="px-4 py-3.5 text-slate-400 font-mono whitespace-nowrap">
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
                                ? "bg-blue-500/10 text-blue-400 border border-blue-500/30"
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
        <div className="grid min-h-screen place-items-center bg-[#090d18] text-[#f8fafc]">
          <div className="text-center text-sm text-slate-400">Loading Service History...</div>
        </div>
      }
    >
      <HistoryContent />
    </Suspense>
  );
}
