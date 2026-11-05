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
      <main className="grid min-h-screen place-items-center bg-[#000000] bg-arounda-glow text-white px-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FC3B00]/25 to-[#FF6129]/20 text-[#FC3B00] border border-[#FC3B00]/30 shadow-lg shadow-[#FC3B00]/10">
            <History size={22} className="animate-spin text-[#FC3B00]" />
          </div>
          <h2 className="text-base font-bold text-white tracking-tight">Verifying FOH Session...</h2>
          <p className="text-xs text-stone-400 font-mono">Loading service history</p>
        </div>
      </main>
    );
  }

  if (!hostToken || !room) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#000000] bg-arounda-glow p-5 text-white">
        <div className="w-full max-w-md rounded-3xl border border-white/15 bg-[#0d0c0e] p-8 text-center space-y-4 shadow-2xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FC3B00]/25 to-red-950 text-[#FC3B00] border border-[#FC3B00]/30 shadow-lg shadow-[#FC3B00]/20">
            <AlertTriangle size={28} />
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">Host Session Required</h1>
          <p className="text-xs text-stone-300 leading-relaxed">
            Only the authorized FOH sound engineer can view the service audit log and debrief history.
          </p>
          <div className="pt-2">
            <Link
              href="/"
              className="h-11 flex items-center justify-center rounded-xl bg-gradient-to-r from-[#FC3B00] to-[#FF6129] px-5 text-xs font-bold text-white shadow-md shadow-[#FC3B00]/25 hover:from-[#E03500] hover:to-[#F2551D] transition"
            >
              Return Home
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[#000000] bg-arounda-glow text-white px-4 py-6 sm:px-8 selection:bg-[#FC3B00] selection:text-white">
      <div className="mx-auto max-w-7xl space-y-5">
        {/* Top Header & Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <Link
              href={`/room/${roomId}/foh`}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-stone-300 hover:text-white hover:bg-white/10 transition"
              title="Return to FOH console"
            >
              <ArrowLeft size={16} />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[#FF7145] flex items-center gap-1.5">
                  <History size={13} /> Service audit &amp; debrief
                </span>
                <span className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] font-mono tabular-nums text-stone-300 font-bold">
                  {room.code}
                </span>
              </div>
              <h1 className="text-xl font-bold text-white tracking-tight">
                {room.name}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={exportCSV}
              disabled={filtered.length === 0}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#FC3B00] to-[#FF6129] px-4 py-2 text-xs font-bold text-white shadow-md shadow-[#FC3B00]/20 hover:from-[#E03500] hover:to-[#F2551D] transition disabled:opacity-40 min-h-[38px] active:translate-y-px"
            >
              <FileSpreadsheet size={14} className="text-white/80" />
              <span>Export CSV ({filtered.length})</span>
            </button>
          </div>
        </div>

        {/* 5-Card Operational Metrics Overview */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <div className="rounded-2xl border border-white/10 bg-black/50 backdrop-blur-md p-4">
            <span className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider">
              Total requests
            </span>
            <div className="mt-1 text-2xl font-bold text-white font-mono tabular-nums">
              {total}
            </div>
            <span className="text-[10px] text-stone-500">Service lifetime</span>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/50 backdrop-blur-md p-4">
            <span className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider">
              Resolved
            </span>
            <div className="mt-1 text-2xl font-bold text-emerald-400 font-mono tabular-nums">
              {resolved.length}
            </div>
            <span className="text-[10px] text-stone-500">
              {total > 0 ? Math.round((resolved.length / total) * 100) : 0}% completion
            </span>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/50 backdrop-blur-md p-4">
            <span className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider">
              Urgent SOS
            </span>
            <div className="mt-1 text-2xl font-bold text-[#FC3B00] font-mono tabular-nums">
              {urgentCount}
            </div>
            <span className="text-[10px] text-stone-500">Emergency cues</span>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/50 backdrop-blur-md p-4">
            <span className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider">
              Avg acknowledge
            </span>
            <div className="mt-1 text-2xl font-bold text-[#FF6129] font-mono tabular-nums">
              {formatSeconds(avgAckDurationSeconds)}
            </div>
            <span className="text-[10px] text-stone-500">FOH reaction time</span>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/50 backdrop-blur-md p-4 col-span-2 sm:col-span-1">
            <span className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider">
              Avg resolution
            </span>
            <div className="mt-1 text-2xl font-bold text-[#FF7145] font-mono tabular-nums">
              {formatSeconds(avgResolveDurationSeconds)}
            </div>
            <span className="text-[10px] text-stone-500">Total mix fix time</span>
          </div>
        </div>

        {/* Multi-Parameter Filters: Musician, Instrument, Status, Date, Text Search */}
        <div className="rounded-2xl border border-white/10 bg-black/50 backdrop-blur-md p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-stone-300">
              <Filter size={13} className="text-[#FC3B00]" />
              <span>Filter service history</span>
            </div>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="text-xs text-[#FF7145] hover:text-white flex items-center gap-1 font-semibold transition"
              >
                <X size={12} /> Reset filters
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
            {/* Search */}
            <div className="relative lg:col-span-1">
              <Search
                size={13}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search text..."
                className="w-full rounded-xl border border-white/15 bg-black/60 py-2 pl-8 pr-3 text-xs text-white placeholder-stone-500 focus:border-[#FC3B00] focus:outline-none"
              />
            </div>

            {/* Musician Filter */}
            <div>
              <select
                value={selectedMusician}
                onChange={(e) => setSelectedMusician(e.target.value)}
                className="w-full rounded-xl border border-white/15 bg-black/60 px-3 py-2 text-xs text-white focus:border-[#FC3B00] focus:outline-none"
              >
                <option value="all" className="bg-[#0f0f10] text-white">All musicians ({musicians.length})</option>
                {musicians.map((m) => (
                  <option key={m} value={m} className="bg-[#0f0f10] text-white">
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
                className="w-full rounded-xl border border-white/15 bg-black/60 px-3 py-2 text-xs text-white focus:border-[#FC3B00] focus:outline-none"
              >
                <option value="all" className="bg-[#0f0f10] text-white">All instruments ({instruments.length})</option>
                {instruments.map((i) => (
                  <option key={i} value={i} className="bg-[#0f0f10] text-white">
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
                className="w-full rounded-xl border border-white/15 bg-black/60 px-3 py-2 text-xs text-white focus:border-[#FC3B00] focus:outline-none"
              >
                <option value="all" className="bg-[#0f0f10] text-white">All statuses</option>
                <option value="pending" className="bg-[#0f0f10] text-white">Pending</option>
                <option value="acknowledged" className="bg-[#0f0f10] text-white">Acknowledged</option>
                <option value="resolved" className="bg-[#0f0f10] text-white">Resolved</option>
              </select>
            </div>

            {/* Date Filter */}
            <div>
              <select
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full rounded-xl border border-white/15 bg-black/60 px-3 py-2 text-xs text-white focus:border-[#FC3B00] focus:outline-none"
              >
                <option value="all" className="bg-[#0f0f10] text-white">All dates ({dates.length})</option>
                {dates.map((d) => (
                  <option key={d} value={d} className="bg-[#0f0f10] text-white">
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* History Table */}
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/50 backdrop-blur-md shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/10 bg-white/5 text-stone-400 font-semibold text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Musician</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Message</th>
                  <th className="px-4 py-3">Submitted</th>
                  <th className="px-4 py-3">Acknowledged</th>
                  <th className="px-4 py-3">Resolved</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-stone-500 font-medium">
                      No records match the selected filters.
                    </td>
                  </tr>
                ) : (
                  filtered.map((req: any) => {
                    const isUrgent = req.priority === "urgent";
                    return (
                      <tr key={req._id} className="hover:bg-white/[0.04] transition">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="font-bold text-white flex items-center gap-1.5">
                            {isUrgent && (
                              <span className="rounded-full bg-red-950/60 text-[#FC3B00] border border-red-500/30 px-1.5 py-0.2 text-[9px] font-bold">
                                SOS
                              </span>
                            )}
                            <span>{req.musicianName}</span>
                          </div>
                          <div className="text-[11px] text-[#FF7145] font-mono">
                            {req.instrument}
                          </div>
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[10px] font-mono text-stone-300">
                            {req.category}
                          </span>
                        </td>

                        <td className="px-4 py-3 max-w-xs sm:max-w-md text-stone-200 leading-relaxed font-medium">
                          {req.message}
                        </td>

                        <td className="px-4 py-3 text-stone-400 font-mono tabular-nums whitespace-nowrap">
                          <div>
                            {new Date(req.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })}
                          </div>
                          <div className="text-[10px] text-stone-500">
                            {new Date(req.createdAt).toISOString().slice(0, 10)}
                          </div>
                        </td>

                        <td className="px-4 py-3 text-stone-400 font-mono tabular-nums whitespace-nowrap">
                          {req.acknowledgedAt ? (
                            <div>
                              <span className="text-[#FF6129] font-medium">
                                {new Date(req.acknowledgedAt).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  second: "2-digit",
                                })}
                              </span>
                              {typeof req.ackDurationSeconds === "number" && (
                                <div className="text-[10px] text-stone-500">
                                  +{req.ackDurationSeconds}s
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-stone-500">—</span>
                          )}
                        </td>

                        <td className="px-4 py-3 text-stone-400 font-mono tabular-nums whitespace-nowrap">
                          {req.resolvedAt ? (
                            <div>
                              <span className="text-emerald-400 font-medium">
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
                            <span className="text-stone-500">—</span>
                          )}
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-mono font-bold capitalize ${
                              req.status === "resolved"
                                ? "bg-emerald-950/40 text-emerald-300 border border-emerald-500/30"
                                : req.status === "acknowledged"
                                ? "bg-[#FC3B00]/15 text-[#FF7145] border border-[#FC3B00]/30"
                                : "bg-amber-950/40 text-amber-300 border border-amber-500/30"
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                req.status === "resolved"
                                  ? "bg-emerald-400"
                                  : req.status === "acknowledged"
                                  ? "bg-[#FC3B00]"
                                  : "bg-amber-400"
                              }`}
                            />
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
          <div className="text-center text-xs text-stone-400 font-mono">Loading service history...</div>
        </div>
      }
    >
      <HistoryContent />
    </Suspense>
  );
}
