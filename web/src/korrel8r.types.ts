export type Node = {
  class: string;
  count: number;
  queries?: Array<{
    count: number;
    query: string;
  }>;
};

export type Start = {
  class: string;
  queries: string[];
};

export type GoalsRequest = {
  goals: Array<string>;
  start: Start;
};

export type Korrel8rResponse = Array<Node>;
