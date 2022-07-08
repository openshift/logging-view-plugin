const generateMatrixValues = ({
  nValues,
  startTime,
}: {
  nValues: number;
  startTime: number;
}) =>
  Array.from({ length: nValues }, (_, i) => [
    startTime + i * 60,
    String(Math.floor(Math.random() * 9999) + 100),
  ]);

const generateStreamValues = ({
  nValues,
  startTime,
  message = 'loki_1      | level=info ts=2022-07-01T08:21:47.5874835Z caller=table.go:443 msg="cleaning up unwanted dbs from table index_19172"',
}: {
  message?: string;
  nValues: number;
  startTime: number;
}) => Array.from({ length: nValues }, (_, i) => [startTime * 1e6 + i, message]);

const generateStream = ({
  level,
  nValues,
  startTime,
  message,
}: {
  level: string;
  startTime: number;
  nValues: number;
  message?: string;
}) => ({
  stream: {
    filename: '/var/log/out.log',
    job: 'varlogs',
    level,
  },
  values: generateStreamValues({ nValues, startTime, message }),
});

export const queryRangeStreamsvalidResponse = ({
  message,
}: {
  message?: string;
}) => {
  const startTime = Date.now();

  return {
    status: 'success',
    data: {
      resultType: 'streams',
      result: [
        generateStream({ level: 'info', nValues: 50, startTime, message }),
        generateStream({ level: 'error', nValues: 50, startTime, message }),
        generateStream({ level: 'warning', nValues: 50, startTime, message }),
        generateStream({ level: 'critical', nValues: 50, startTime, message }),
      ],
      stats: {
        summary: {
          bytesProcessedPerSecond: 269479887,
          linesProcessedPerSecond: 859141,
          totalBytesProcessed: 28840573,
          totalLinesProcessed: 91948,
          execTime: 0.1070231,
          queueTime: 0.0000893,
          subqueries: 1,
        },
        querier: {
          store: {
            totalChunksRef: 0,
            totalChunksDownloaded: 0,
            chunksDownloadTime: 0,
            chunk: {
              headChunkBytes: 0,
              headChunkLines: 0,
              decompressedBytes: 0,
              decompressedLines: 0,
              compressedBytes: 0,
              totalDuplicates: 0,
            },
          },
        },
        ingester: {
          totalReached: 1,
          totalChunksMatched: 8,
          totalBatches: 2,
          totalLinesSent: 200,
          store: {
            totalChunksRef: 8,
            totalChunksDownloaded: 8,
            chunksDownloadTime: 1248200,
            chunk: {
              headChunkBytes: 990544,
              headChunkLines: 5782,
              decompressedBytes: 27850029,
              decompressedLines: 86166,
              compressedBytes: 2935987,
              totalDuplicates: 0,
            },
          },
        },
      },
    },
  };
};

export const queryRangeMatrixValidResponse = () => {
  const startTime = Math.floor((Date.now() - 1000 * 60 * 60) / 1000);
  return {
    status: 'success',
    data: {
      resultType: 'matrix',
      result: [
        {
          metric: { level: '' },
          values: generateMatrixValues({ nValues: 60, startTime }),
        },
        {
          metric: { level: 'error' },
          values: generateMatrixValues({ nValues: 60, startTime }),
        },
        {
          metric: { level: 'info' },
          values: generateMatrixValues({ nValues: 60, startTime }),
        },
        {
          metric: { level: 'warn' },
          values: generateMatrixValues({ nValues: 60, startTime }),
        },
      ],
      stats: {
        summary: {
          bytesProcessedPerSecond: 547879221,
          linesProcessedPerSecond: 1724574,
          totalBytesProcessed: 150371972,
          totalLinesProcessed: 473330,
          execTime: 0.2744619,
          queueTime: 1.915225593,
          subqueries: 3,
        },
        querier: {
          store: {
            totalChunksRef: 0,
            totalChunksDownloaded: 0,
            chunksDownloadTime: 0,
            chunk: {
              headChunkBytes: 0,
              headChunkLines: 0,
              decompressedBytes: 0,
              decompressedLines: 0,
              compressedBytes: 0,
              totalDuplicates: 0,
            },
          },
        },
        ingester: {
          totalReached: 48,
          totalChunksMatched: 26,
          totalBatches: 726,
          totalLinesSent: 366634,
          store: {
            totalChunksRef: 8,
            totalChunksDownloaded: 8,
            chunksDownloadTime: 9204000,
            chunk: {
              headChunkBytes: 707614,
              headChunkLines: 3942,
              decompressedBytes: 149664358,
              decompressedLines: 469388,
              compressedBytes: 12792674,
              totalDuplicates: 93688,
            },
          },
        },
      },
    },
  };
};

export const queryRangeMatrixInvalidResponse = () => {
  return {};
};
export const queryRangeStreamsInvalidResponse = () => {
  return {};
};
