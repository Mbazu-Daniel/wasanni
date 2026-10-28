export type SweepResult = {
  expiredSessions: number;
  purgedAuthSessions: number;
  purgedVerifications: number;
};

export type Block = {
  scoreId: string;
  offset: number;
  length: number;
  rows: number;
};
