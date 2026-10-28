import type {
  CreateGameConfigBody,
  CreateGameFileBody,
  UpdateGameConfigBody,
} from "@wasanni/contracts";

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
