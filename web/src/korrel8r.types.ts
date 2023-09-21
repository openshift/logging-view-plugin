export type Node = {
  class: string;
  count: number;
  queries?: Array<{
    count: number;
    query: {
      LogQL: string;
      LogType: string;
    };
  }>;
};

export type Start = {
  class: string;
  queries: Array<{
    Labels: {
      alertname: string;
    };
  }>;
};

export type GoalsRequest = {
  goals: Array<string>;
  start: Start;
};

export type Korrel8rResponse = Array<Node>;
