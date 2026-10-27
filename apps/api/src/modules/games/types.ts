import type {
  AssignmentStatus,
  CreateGameConfigBody,
  CreateGameFileBody,
  GameHosting,
  GameStatus,
  UpdateGameConfigBody,
} from "@wasanni/contracts";
import type { Db } from "@wasanni/db";
import type { Enqueuer } from "@wasanni/jobs";
import type {
  game,
  gameConfig,
  gameFile,
  gamePlatformAssignment,
} from "@wasanni/db/schema";
import type { ObjectStorage, StorageLimits } from "@wasanni/kit";
import type { createAssignmentService } from "./assignment.service.ts";
import type { createGameConfigService } from "./game-config.service.ts";
import type { createGameFileService } from "./game-file.service.ts";
import type { createGameService } from "./game.service.ts";

export type GameFileUploadInput = {
  gameId: string;
  memberId: string;
  body: CreateGameFileBody;
};

export type AssignmentCreateInput = {
  gameId: string;
  memberId: string;
  platformId: string;
};

export type GameConfigCreateInput = {
  gameId: string;
  assignmentId: string;
  body: CreateGameConfigBody;
};

export type GameConfigUpdateInput = {
  gameId: string;
  assignmentId: string;
  configId: string;
  body: UpdateGameConfigBody;
};

export type GameState = {
  id: string;
  hosting: GameHosting;
  status: GameStatus;
};

export type AssignmentState = {
  id: string;
  status: AssignmentStatus;
};

export type AssignmentConfig = {
  id: string;
  config: Record<string, unknown>;
  schemaVersion: number;
};

export type GameRow = (typeof game.$inferSelect);

export type GameConfigRow = (typeof gameConfig.$inferSelect);

export type GameFileRow = (typeof gameFile.$inferSelect);

export type AssignmentRow = (typeof gamePlatformAssignment.$inferSelect);

export type GameService = ReturnType<typeof createGameService>;

export type GameConfigService = ReturnType<typeof createGameConfigService>;

export type GameFileService = ReturnType<typeof createGameFileService>;

export type AssignmentService = ReturnType<typeof createAssignmentService>;

export type GamesDeps = {
  db: Db;
  storage: ObjectStorage;
  config: StorageLimits;
  enqueuer?: Enqueuer | null;
  onConfigChanged?: (input: {
    organizationId: string;
    configId: string;
  }) => Promise<void>;
};

export type GameRouteDeps = {
  service: GameService;
};

export type GameFileRouteDeps = {
  service: GameFileService;
};

export type AssignmentRouteDeps = {
  service: AssignmentService;
};

export type GameConfigRouteDeps = {
  service: GameConfigService;
};
