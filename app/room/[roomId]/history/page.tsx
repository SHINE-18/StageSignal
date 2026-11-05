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
      <main className="grid min-h-screen place-items-center bg-[#141415] text-[#ededed] px-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#232325] text-[#fc3b00] border border-white/[0.08]">
            <History size={20} className="animate-spin text-[#fc3b00]" />
          </div>
          <h2 className="text-sm font-semibold text-[#ededed]">Verifying FOH session...</h2>
          <p className="text-xs text-[#85858b] font-mono">Loading service history</p>
        </div>
      </main>
    );
  }

  if (!hostToken || !room) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#141415] p-5 text-[#ededed]">
        <div className="w-full max-w-md rounded-xl border border-white/[0.08] bg-[#19191b] p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-[#232325] text-amber-400 border border-white/[0.08]">
            <AlertTriangle size={24} />
          </div>
          <h1 className="text-xl font-bold text-[#ededed] tracking-tight">Host session required</h1>
          <p className="mt-2 text-xs sm:text-sm text-[#a1a1a6] leading-relaxed">
            Only the authorized FOH sound engineer can view the service audit log and debrief history.
          </p>
          <div className="mt-6">
            <Link
              href="/"
              className="inline-block rounded-lg bg-[#fc3b00] hover:bg-[#e03500] px-5 py-2.5 text-xs font-semibold text-white transition active:translate-y-px"
            >
              Return home
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[#141415] text-[#ededed] px-4 py-6 sm:px-8 selection:bg-[#fc3b00] selection:text-white">
      <div className="mx-auto max-w-7xl space-y-5">
        {/* Top Header & Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
          <div className="flex items-center gap-3">
            <Link
              href={`/room/${roomId}/foh`}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] bg-[#232325] text-[#a1a1a6] hover:text-[#ededed] hover:border-white/[0.15] transition"
              title="Return to FOH console"
            >
              <ArrowLeft size={16} />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-[#fc3b00] flex items-center gap-1.5">
                  <History size={13} /> Service audit &amp; debrief
                </span>
                <span className="rounded-md border border-white/[0.08] bg-[#232325] px-1.5 py-0.5 text-[10px] font-mono tabular-nums text-[#ededed]">
                  {room.code}
                </span>
              </div>
              <h1 className="text-xl font-bold text-[#ededed] tracking-tight">
                {room.name}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={exportCSV}
              disabled={filtered.length === 0}
              className="flex items-center gap-2 rounded-lg bg-[#232325] hover:bg-[#2c2c2f] border border-white/[0.08] px-3.5 py-2 text-xs font-semibold text-[#ededed] transition disabled:opacity-40 min-h-[38px] active:translate-y-px"
            >
              <FileSpreadsheet size={14} className="text-[#a1a1a6]" />
              <span>Export CSV ({filtered.length})</span>
            </button>
          </div>
        </div>

        {/* 5-Card Operational Metrics Overview */}
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
          <div className="rounded-lg border border-white/[0.08] bg-[#19191b] p-3.5">
            <span className="text-[11px] font-medium text-[#85858b]">
              Total requests
            </span>
            <div className="mt-1 text-2xl font-bold text-[#ededed] font-mono tabular-nums">
              {total}
            </div>
            <span className="text-[10px] text-[#85858b]">Service lifetime</span>
          </div>

          <div className="rounded-lg border border-white/[0.08] bg-[#19191b] p-3.5">
            <span className="text-[11px] font-medium text-[#85858b]">
              Resolved
            </span>
            <div className="mt-1 text-2xl font-bold text-[#4cc38a] font-mono tabular-nums">
              {resolved.length}
            </div>
            <span className="text-[10px] text-[#85858b]">
              {total > 0 ? Math.round((resolved.length / total) * 100) : 0}% completion
            </span>
          </div>

          <div className="rounded-lg border border-white/[0.08] bg-[#19191b] p-3.5">
            <span className="text-[11px] font-medium text-[#85858b]">
              Urgent SOS
            </span>
            <div className="mt-1 text-2xl font-bold text-[#e5484d] font-mono tabular-nums">
              {urgentCount}
            </div>
            <span className="text-[10px] text-[#85858b]">Emergency cues</span>
          </div>

          <div className="rounded-lg border border-white/[0.08] bg-[#19191b] p-3.5">
            <span className="text-[11px] font-medium text-[#85858b]">
              Avg acknowledge
            </span>
            <div className="mt-1 text-2xl font-bold text-[#fc3b00] font-mono tabular-nums">
              {formatSeconds(avgAckDurationSeconds)}
            </div>
            <span className="text-[10px] text-[#85858b]">FOH reaction time</span>
          </div>

          <div className="rounded-lg border border-white/[0.08] bg-[#19191b] p-3.5 col-span-2 sm:col-span-1">
            <span className="text-[11px] font-medium text-[#85858b]">
              Avg resolution
            </span>
            <div className="mt-1 text-2xl font-bold text-amber-400 font-mono tabular-nums">
              {formatSeconds(avgResolveDurationSeconds)}
            </div>
            <span className="text-[10px] text-[#85858b]">Total mix fix time</span>
          </div>
        </div>

        {/* Multi-Parameter Filters: Musician, Instrument, Status, Date, Text Search */}
        <div className="rounded-lg border border-white/[0.08] bg-[#19191b] p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-medium text-[#a1a1a6]">
              <Filter size={13} className="text-[#fc3b00]" />
              <span>Filter service history</span>
            </div>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="text-xs text-[#fc3b00] hover:text-white flex items-center gap-1 font-medium transition"
              >
                <X size={12} /> Reset filters
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
            {/* Search */}
            <div className="relative lg:col-span-1">
              <Search
                size={13}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#85858b]"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search text..."
                className="w-full rounded-lg border border-white/[0.08] bg-[#0f0f10] py-2 pl-8 pr-3 text-xs text-[#ededed] placeholder-[#85858b] focus:border-[#fc3b00] focus:outline-none"
              />
            </div>

            {/* Musician Filter */}
            <div>
              <select
                value={selectedMusician}
                onChange={(e) => setSelectedMusician(e.target.value)}
                className="w-full rounded-lg border border-white/[0.08] bg-[#0f0f10] px-2.5 py-2 text-xs text-[#ededed] focus:border-[#fc3b00] focus:outline-none"
              >
                <option value="all">All musicians ({musicians.length})</option>
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
                className="w-full rounded-lg border border-white/[0.08] bg-[#0f0f10] px-2.5 py-2 text-xs text-[#ededed] focus:border-[#fc3b00] focus:outline-none"
              >
                <option value="all">All instruments ({instruments.length})</option>
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
                className="w-full rounded-lg border border-white/[0.08] bg-[#0f0f10] px-2.5 py-2 text-xs text-[#ededed] focus:border-[#fc3b00] focus:outline-none"
              >
                <option value="all">All statuses</option>
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
                className="w-full rounded-lg border border-white/[0.08] bg-[#0f0f10] px-2.5 py-2 text-xs text-[#ededed] focus:border-[#fc3b00] focus:outline-none"
              >
                <option value="all">All dates ({dates.length})</option>
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
        <div className="overflow-hidden rounded-lg border border-white/[0.08] bg-[#19191b]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/[0.08] bg-[#0f0f10] text-[#85858b] font-medium text-[11px] uppercase tracking-wider">
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
                    <td colSpan={7} className="px-4 py-12 text-center text-[#85858b]">
                      No records match the selected filters.
                    </td>
                  </tr>
                ) : (
                  filtered.map((req: any) => {
                    const isUrgent = req.priority === "urgent";
                    return (
                      <tr key={req._id} className="hover:bg-[#232325]/30 transition">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="font-semibold text-[#ededed] flex items-center gap-1.5">
                            {isUrgent && (
                              <span className="rounded bg-red-950/40 text-[#e5484d] border border-red-500/20 px-1 py-0.2 text-[9px] font-bold">
                                SOS
                              </span>
                            )}
                            <span>{req.musicianName}</span>
                          </div>
                          <div className="text-[11px] text-[#85858b]">
                            {req.instrument}
                          </div>
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="rounded-md border border-white/[0.08] bg-[#232325] px-2 py-0.5 text-[10px] font-medium text-[#ededed]">
                            {req.category}
                          </span>
                        </td>

                        <td className="px-4 py-3 max-w-xs sm:max-w-md text-[#ededed] leading-relaxed">
                          {req.message}
                        </td>

                        <td className="px-4 py-3 text-[#85858b] font-mono tabular-nums whitespace-nowrap">
                          <div>
                            {new Date(req.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })}
                          </div>
                          <div className="text-[10px] text-[#85858b]">
                            {new Date(req.createdAt).toISOString().slice(0, 10)}
                          </div>
                        </td>

                        <td className="px-4 py-3 text-[#85858b] font-mono tabular-nums whitespace-nowrap">
                          {req.acknowledgedAt ? (
                            <div>
                              <span className="text-[#fc3b00]">
                                {new Date(req.acknowledgedAt).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  second: "2-digit",
                                })}
                              </span>
                              {typeof req.ackDurationSeconds === "number" && (
                                <div className="text-[10px] text-[#85858b]">
                                  +{req.ackDurationSeconds}s
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-[#85858b]">—</span>
                          )}
                        </td>

                        <td className="px-4 py-3 text-[#85858b] font-mono tabular-nums whitespace-nowrap">
                          {req.resolvedAt ? (
                            <div>
                              <span className="text-[#4cc38a] font-medium">
                                {new Date(req.resolvedAt).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  second: "2-digit",
                                })}
                              </span>
                              {typeof req.durationSeconds === "number" && (
                                <div className="text-[10px] text-[#4cc38a]/80">
                                  {formatSeconds(req.durationSeconds)}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-[#85858b]">—</span>
                          )}
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[10px] font-medium capitalize ${
                              req.status === "resolved"
                                ? "bg-emerald-950/30 text-[#4cc38a] border border-emerald-500/20"
                                : req.status === "acknowledged"
                                ? "bg-[#fc3b00]/10 text-[#fc3b00] border border-[#fc3b00]/20"
                                : "bg-amber-950/30 text-amber-300 border border-amber-500/20"
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                req.status === "resolved"
                                  ? "bg-[#4cc38a]"
                                  : req.status === "acknowledged"
                                  ? "bg-[#fc3b00]"
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
        <div className="grid min-h-screen place-items-center bg-[#141415] text-[#ededed]">
          <div className="text-center text-xs text-[#85858b]">Loading service history...</div>
        </div>
      }
    >
      <HistoryContent />
    </Suspense>
  );
}
