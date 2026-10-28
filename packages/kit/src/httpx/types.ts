export type Page<T> = {
  data: T[];
  page: {
    cursor: string | null;
    hasMore: boolean;
    limit: number;
  };
};
