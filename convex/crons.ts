import { cronJobs } from "convex/server";
import { api } from "./_generated/api";

const crons = cronJobs();

// Sweep overdue rooms every 10 minutes to maintain room lifecycle
crons.interval(
  "sweep-overdue-rooms",
  { minutes: 10 },
  api.rooms.sweepOverdueRooms
);

export default crons;

