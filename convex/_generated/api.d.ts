/* eslint-disable */
import type { FunctionReference, AnyApi } from "convex/server";
import type { Id, RoomSessionType, RequestPriority, RequestStatus, ParticipantStatus } from "./dataModel.js";

export declare const api: {
  rooms: {
    createRoom: FunctionReference<
      "mutation",
      "public",
      {
        name: string;
        sessionType: RoomSessionType;
        capacity?: number;
        maxApproved?: number;
        hostToken: string;
      },
      { roomId: Id<"rooms">; code: string }
    >;
    getRoomByCode: FunctionReference<
      "query",
      "public",
      { code: string },
      {
        state: "active" | "ended" | "expired" | "not_found";
        room: {
          _id: Id<"rooms">;
          name: string;
          code: string;
          sessionType: RoomSessionType;
          status: "active" | "ended";
          capacity: number;
          expiresAt: number;
          isExpired: boolean;
        } | null;
      }
    >;
    getHostRoom: FunctionReference<
      "query",
      "public",
      { roomId: Id<"rooms">; hostToken: string },
      {
        _id: Id<"rooms">;
        name: string;
        code: string;
        sessionType: RoomSessionType;
        status: "active" | "ended";
        capacity: number;
        maxApproved: number;
        createdAt: number;
        expiresAt: number;
        endedAt?: number;
        isExpired: boolean;
      } | null
    >;
    getRoomPublicInfo: FunctionReference<
      "query",
      "public",
      { roomId: Id<"rooms"> },
      {
        _id: Id<"rooms">;
        name: string;
        code: string;
        sessionType: RoomSessionType;
        status: "active" | "ended";
        capacity: number;
        expiresAt: number;
        isExpired: boolean;
      } | null
    >;
    endRoom: FunctionReference<
      "mutation",
      "public",
      { roomId: Id<"rooms">; hostToken: string },
      { success: boolean; alreadyEnded: boolean }
    >;
    expireRoom: FunctionReference<
      "mutation",
      "public",
      { roomId: Id<"rooms"> },
      boolean
    >;
    sweepOverdueRooms: FunctionReference<
      "mutation",
      "public",
      {},
      { swept: number }
    >;
  };
  participants: {
    requestJoin: FunctionReference<
      "mutation",
      "public",
      {
        code: string;
        name: string;
        instrument: string;
        participantToken: string;
      },
      {
        participantId: Id<"participants">;
        roomId: Id<"rooms">;
        roomName: string;
        status: "pending";
      }
    >;
    listParticipantsForHost: FunctionReference<
      "query",
      "public",
      { roomId: Id<"rooms">; hostToken: string },
      Array<{
        _id: Id<"participants">;
        _creationTime: number;
        roomId: Id<"rooms">;
        name: string;
        instrument: string;
        status: ParticipantStatus;
        joinedAt: number;
        lastSeenAt: number;
        isOnline: boolean;
      }>
    >;
    approveParticipant: FunctionReference<
      "mutation",
      "public",
      {
        participantId: Id<"participants">;
        hostToken: string;
      },
      { success: boolean }
    >;
    rejectParticipant: FunctionReference<
      "mutation",
      "public",
      {
        participantId: Id<"participants">;
        hostToken: string;
      },
      { success: boolean }
    >;
    removeParticipant: FunctionReference<
      "mutation",
      "public",
      {
        participantId: Id<"participants">;
        hostToken: string;
      },
      { success: boolean }
    >;
    getParticipantStatus: FunctionReference<
      "query",
      "public",
      {
        roomId: Id<"rooms">;
        participantToken: string;
        participantId?: Id<"participants">;
      },
      | {
          state: "found";
          participantId: Id<"participants">;
          name: string;
          instrument: string;
          status: ParticipantStatus;
          roomName: string;
          roomCode: string;
          roomStatus: "active" | "ended";
          sessionType?: RoomSessionType;
          isExpired: boolean;
        }
      | {
          state: "invalid_token" | "room_not_found" | "not_found";
          message: string;
        }
    >;
    getMusicianSession: FunctionReference<
      "query",
      "public",
      {
        roomId: Id<"rooms">;
        participantToken: string;
      },
      | {
          authorized: true;
          participant: {
            _id: Id<"participants">;
            name: string;
            instrument: string;
            roomId: Id<"rooms">;
            roomName: string;
            roomCode: string;
          };
        }
      | {
          authorized: false;
          status: string;
        }
    >;
    listApprovedParticipants: FunctionReference<
      "query",
      "public",
      { roomId: Id<"rooms">; participantToken: string },
      Array<{
        _id: Id<"participants">;
        name: string;
        instrument: string;
        isOnline: boolean;
      }>
    >;
    updatePresence: FunctionReference<
      "mutation",
      "public",
      { participantId: Id<"participants">; participantToken: string },
      boolean
    >;
  };
  requests: {
    createRequest: FunctionReference<
      "mutation",
      "public",
      {
        roomId: Id<"rooms">;
        participantToken: string;
        category: string;
        message?: string;
        priority?: RequestPriority;
      },
      { requestId: Id<"requests">; status: "pending" }
    >;
    listRequestsForHost: FunctionReference<
      "query",
      "public",
      { roomId: Id<"rooms">; hostToken: string },
      Array<{
        _id: Id<"requests">;
        _creationTime: number;
        roomId: Id<"rooms">;
        participantId: Id<"participants">;
        musicianName: string;
        instrument: string;
        category: string;
        message: string;
        priority: RequestPriority;
        status: RequestStatus;
        createdAt: number;
        acknowledgedAt?: number;
        resolvedAt?: number;
      }>
    >;
    updateRequestStatus: FunctionReference<
      "mutation",
      "public",
      {
        requestId: Id<"requests">;
        hostToken: string;
        status: "acknowledged" | "resolved";
      },
      boolean
    >;
    listMyRequests: FunctionReference<
      "query",
      "public",
      { roomId: Id<"rooms">; participantToken: string },
      Array<{
        _id: Id<"requests">;
        category: string;
        message: string;
        priority: RequestPriority;
        status: RequestStatus;
        createdAt: number;
        acknowledgedAt?: number;
        resolvedAt?: number;
      }>
    >;
    listRoomRequestHistory: FunctionReference<
      "query",
      "public",
      { roomId: Id<"rooms">; hostToken: string },
      Array<{
        _id: Id<"requests">;
        musicianName: string;
        instrument: string;
        category: string;
        message: string;
        priority: RequestPriority;
        status: RequestStatus;
        createdAt: number;
        acknowledgedAt?: number;
        resolvedAt?: number;
        durationSeconds?: number;
      }>
    >;
  };
  presence: {
    heartbeat: FunctionReference<
      "mutation",
      "public",
      { roomId: Id<"rooms">; participantToken: string },
      boolean
    >;
    hostHeartbeat: FunctionReference<
      "mutation",
      "public",
      { roomId: Id<"rooms">; hostToken: string },
      boolean
    >;
    getHostPresenceForMusician: FunctionReference<
      "query",
      "public",
      { roomId: Id<"rooms">; participantToken: string },
      { isHostOnline: boolean; lastHostSeenAt?: number }
    >;
    getRoomPresence: FunctionReference<
      "query",
      "public",
      { roomId: Id<"rooms">; hostToken: string },
      {
        totalApproved: number;
        onlineCount: number;
        offlineCount: number;
        participants: Array<{
          _id: Id<"participants">;
          name: string;
          instrument: string;
          isOnline: boolean;
          lastSeenAt: number;
        }>;
      }
    >;
  };
};

export declare const internal: AnyApi;

