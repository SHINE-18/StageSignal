/* eslint-disable */
/**
 * Generated data model types.
 * THIS CODE IS AUTOMATICALLY GENERATED.
 */

import type { GenericId } from "convex/values";
import type {
  GenericDataModel,
  GenericDatabaseReader,
  GenericDatabaseWriter,
} from "convex/server";

export type Id<TableName extends TableNames> = GenericId<TableName>;

export type TableNames = "rooms" | "participants" | "requests" | "requestEvents";

export type RoomSessionType = "sunday" | "rehearsal" | "special";
export type RoomStatus = "active" | "ended";
export type ParticipantStatus = "pending" | "approved" | "rejected" | "removed";
export type RequestPriority = "normal" | "urgent";
export type RequestStatus = "pending" | "acknowledged" | "resolved";

export interface RoomDoc {
  _id: Id<"rooms">;
  _creationTime: number;
  name: string;
  code: string;
  status: RoomStatus;
  sessionType: RoomSessionType;
  hostTokenHash: string;
  capacity?: number;
  maxApproved?: number;
  createdAt: number;
  expiresAt: number;
  endedAt?: number;
  lastHostSeenAt?: number;
}

export interface ParticipantDoc {
  _id: Id<"participants">;
  _creationTime: number;
  roomId: Id<"rooms">;
  name: string;
  instrument: string;
  participantTokenHash: string;
  status: ParticipantStatus;
  joinedAt: number;
  lastSeenAt: number;
}

export interface RequestDoc {
  _id: Id<"requests">;
  _creationTime: number;
  roomId: Id<"rooms">;
  participantId: Id<"participants">;
  category: string;
  message: string;
  priority: RequestPriority;
  status: RequestStatus;
  createdAt: number;
  acknowledgedAt?: number;
  resolvedAt?: number;
}

export interface RequestEventDoc {
  _id: Id<"requestEvents">;
  _creationTime: number;
  requestId: Id<"requests">;
  roomId: Id<"rooms">;
  action: "created" | "acknowledged" | "resolved";
  actorType: "musician" | "host";
  actorName?: string;
  timestamp: number;
}

export type Doc<TableName extends TableNames> =
  TableName extends "rooms" ? RoomDoc :
  TableName extends "participants" ? ParticipantDoc :
  TableName extends "requests" ? RequestDoc :
  TableName extends "requestEvents" ? RequestEventDoc :
  never;

export interface DataModel extends GenericDataModel {
  rooms: {
    document: RoomDoc;
    fieldPaths: keyof RoomDoc;
    indexes: {
      by_code: ["code"];
      by_status: ["status"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  participants: {
    document: ParticipantDoc;
    fieldPaths: keyof ParticipantDoc;
    indexes: {
      by_room: ["roomId"];
      by_room_and_status: ["roomId", "status"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  requests: {
    document: RequestDoc;
    fieldPaths: keyof RequestDoc;
    indexes: {
      by_room: ["roomId"];
      by_participant: ["participantId"];
      by_room_and_status: ["roomId", "status"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  requestEvents: {
    document: RequestEventDoc;
    fieldPaths: keyof RequestEventDoc;
    indexes: {
      by_request: ["requestId"];
      by_room: ["roomId"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
}

export type DatabaseReader = GenericDatabaseReader<DataModel>;
export type DatabaseWriter = GenericDatabaseWriter<DataModel>;

