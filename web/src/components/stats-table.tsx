import React from 'react';
import { QueryRangeResponse } from '../logs.types';
import { Tooltip } from '@patternfly/react-core';
import { Tbody, Table, Td, Th, Thead, Tr } from '@patternfly/react-table';
import { TestIds } from '../test-ids';
import { useTranslation } from 'react-i18next';
import './stats-table.css';

interface StatsTableProps {
  logsData?: QueryRangeResponse;
}

const convertBytes = (bytes: number | undefined) => {
  if (bytes === undefined) {
    return undefined;
  }

  if (bytes <= 1000000) {
    return bytes + ' B';
  }

  // convert Bytes to MB
  return Math.round((bytes / 1000000) * 100) / 100 + ' MB';
};

const convertTime = (time: number | undefined) => {
  if (time === undefined) {
    return undefined;
  }

  if (time >= 1) {
    return Math.round(time * 100) / 100 + ' s';
  }
  // convert float seconds to ms
  return Math.round(time * 1000 * 100) / 100 + ' ms';
};

const convertNano = (time: number | undefined) => {
  if (time === undefined) {
    return undefined;
  }
  // converts ns to ns
  time = Math.round((time / 1000000) * 100) / 100;

  // if the time is > 1s
  if (time >= 1000) {
    return Math.round((time / 1000) * 100) / 100 + ' s';
  }

  return Math.round(time * 100) / 100 + ' ms';
};

export const StatsTable: React.FC<StatsTableProps> = ({ logsData }) => {
  const { t } = useTranslation('plugin__logging-view-plugin');

  return (
    <div data-test={TestIds.LogsStats}>
      <div className="co-stats-title">{t('Statistics')}</div>
      <div className="co-stats__content">
        <Table className="co-stats-table" variant="compact" aria-label={t('Statistics')}>
          <Thead>
            <Th className="co-stats-table__header"></Th>
            <Th></Th>
            <Th className="co-stats-table__header"></Th>
            <Th></Th>
            <Th className="co-stats-table__header"></Th>
            <Th></Th>
          </Thead>

          <Tbody>
            <Tr>
              <Td>
                <strong>{t('Summary')}</strong>
              </Td>

              <Td></Td>

              <Td>
                <strong>{t('Ingester')}</strong>
              </Td>

              <Td></Td>

              <Td>
                <strong>{t('Storage')}</strong>
              </Td>
            </Tr>

            <Tr>
              <Tooltip content={t('Total of bytes processed per second')} className="pf-c-tooltip">
                <Td>Bytes Processed Per Second:</Td>
              </Tooltip>
              <Td>
                <strong>
                  {convertBytes(logsData?.data.stats.summary?.bytesProcessedPerSecond) ?? 'NA'}/s
                </strong>
              </Td>

              <Tooltip content={t('Amount of ingesters reached')}>
                <Td>Total Reached:</Td>
              </Tooltip>
              <Td>
                <strong>
                  {convertBytes(logsData?.data.stats.ingester?.totalReached) ?? 'NA'}{' '}
                </strong>
              </Td>

              <Tooltip content={t('Total chunks found in the index for the current query')}>
                <Td>Total Chunks Referenced:</Td>
              </Tooltip>
              <Td>
                <strong>{logsData?.data.stats.querier?.store?.totalChunksRef ?? 'NA'}</strong>
              </Td>
            </Tr>

            <Tr>
              <Tooltip content={t('Total lines processed per second')}>
                <Td> Lines Processed Per Second:</Td>
              </Tooltip>
              <Td>
                <strong>{logsData?.data.stats.summary?.linesProcessedPerSecond ?? 'NA'}</strong>
              </Td>

              <Tooltip content={t('Total chunks matched by ingesters')}>
                <Td>Total Chunks Matched:</Td>
              </Tooltip>
              <Td>
                <strong>{logsData?.data.stats.ingester?.totalChunksMatched ?? 'NA'}</strong>
              </Td>

              <Tooltip content={t('Total of chunks downloaded')}>
                <Td>Total Chunks Downloaded:</Td>
              </Tooltip>
              <Td>
                <strong>
                  {logsData?.data.stats.querier?.store?.totalChunksDownloaded ?? 'NA'}
                </strong>
              </Td>
            </Tr>

            <Tr>
              <Tooltip content={t('Total amount of bytes processed overall for this request')}>
                <Td>Total Bytes Processed</Td>
              </Tooltip>
              <Td>
                <strong>
                  {convertBytes(logsData?.data.stats.summary?.totalBytesProcessed) ?? 'NA'}
                </strong>
              </Td>

              <Tooltip content={t('Total batches sent by ingesters')}>
                <Td>Total Batches:</Td>
              </Tooltip>
              <Td>
                <strong>{logsData?.data.stats.ingester?.totalBatches ?? 'NA'}</strong>
              </Td>

              <Tooltip content={t('Total time spent downloading chunks in seconds')}>
                <Td>Chunks Download Time:</Td>
              </Tooltip>
              <Td>
                <strong>
                  {convertNano(logsData?.data.stats.querier?.store?.chunksDownloadTime) ?? 'NA'}
                </strong>
              </Td>
            </Tr>

            <Tr>
              <Tooltip content={t('Total amount of lines processed overall for this request')}>
                <Td>Total Lines Processed:</Td>
              </Tooltip>
              <Td>
                <strong>{logsData?.data.stats.summary?.totalLinesProcessed ?? 'NA'}</strong>
              </Td>

              <Tooltip content={t('Total lines sent by ingesters')}>
                <Td>Total Lines Sent:</Td>
              </Tooltip>
              <Td>
                <strong>{logsData?.data.stats.ingester?.totalLinesSent ?? 'NA'}</strong>
              </Td>

              <Tooltip content={t('Total bytes read from store head chunks')}>
                <Td>Head Chunk Bytes:</Td>
              </Tooltip>
              <Td>
                <strong>
                  {convertBytes(logsData?.data.stats.querier?.store?.chunk?.headChunkBytes) ?? 'NA'}
                </strong>
              </Td>
            </Tr>

            <Tr>
              <Tooltip content={t('Total execution time')}>
                <Td>Execution Time:</Td>
              </Tooltip>
              <Td>
                <strong>{convertTime(logsData?.data.stats.summary?.execTime) ?? 'NA'}</strong>
              </Td>

              <Tooltip
                content={t('Total chunks found in the index for the current query by ingesters')}
              >
                <Td>Total Chunks Referenced:</Td>
              </Tooltip>
              <Td>
                <strong>{logsData?.data.stats.ingester?.store?.totalChunksRef ?? 'NA'}</strong>
              </Td>

              <Tooltip content={t('Total lines read from store head chunks')}>
                <Td>Head Chunk Lines:</Td>
              </Tooltip>
              <Td>
                <strong>
                  {logsData?.data.stats.querier?.store?.chunk?.headChunkLines ?? 'NA'}
                </strong>
              </Td>
            </Tr>

            <Tr>
              <Tooltip content={t('Total queue time')}>
                <Td>Queue Time:</Td>
              </Tooltip>
              <Td>
                <strong>{convertTime(logsData?.data.stats.summary?.queueTime) ?? 'NA'}</strong>
              </Td>

              <Tooltip content={t('Total of chunks downloaded')}>
                <Td>Total Chunks Downloaded:</Td>
              </Tooltip>
              <Td>
                <strong>
                  {logsData?.data.stats.ingester?.store?.totalChunksDownloaded ?? 'NA'}
                </strong>{' '}
              </Td>

              <Tooltip content={t('Total bytes decompressed and processed by store')}>
                <Td>Decompressed Bytes:</Td>
              </Tooltip>
              <Td>
                <strong>
                  {convertBytes(logsData?.data.stats.querier?.store?.chunk?.decompressedBytes) ??
                    'NA'}
                </strong>
              </Td>
            </Tr>

            <Tr>
              <Tooltip content={t('Total amount of sub queries')}>
                <Td>Sub Queries:</Td>
              </Tooltip>
              <Td>
                <strong>{logsData?.data.stats.summary?.subqueries ?? 'NA'}</strong>
              </Td>

              <Tooltip content={t('Total time spent downloading chunks in seconds')}>
                <Td>Chunks Download Time:</Td>
              </Tooltip>
              <Td>
                <strong>
                  {convertNano(logsData?.data.stats.ingester?.store?.chunksDownloadTime) ?? 'NA'}
                </strong>
              </Td>

              <Tooltip content={t('Total lines decompressed and processed by the store')}>
                <Td>Decompressed Lines:</Td>
              </Tooltip>
              <Td>
                <strong>
                  {logsData?.data.stats.querier?.store?.chunk?.decompressedLines ?? 'NA'}{' '}
                </strong>
              </Td>
            </Tr>

            <Tr>
              <Tooltip content={t('Total amount of entries')}>
                <Td>Total Entries Returned:</Td>
              </Tooltip>
              <Td>
                <strong>{logsData?.data.stats.summary?.totalEntriesReturned ?? 'NA'}</strong>
              </Td>

              <Tooltip content={t('Total bytes read from ingesters head chunks')}>
                <Td>Head Chunk Bytes:</Td>
              </Tooltip>
              <Td>
                <strong>
                  {convertBytes(logsData?.data.stats.ingester?.store?.chunk?.headChunkBytes) ??
                    'NA'}
                </strong>
              </Td>

              <Tooltip
                content={t('Total bytes of compressed chunks (blocks) processed by the store')}
              >
                <Td>Compressed Bytes:</Td>
              </Tooltip>
              <Td>
                <strong>
                  {convertBytes(logsData?.data.stats.querier?.store?.chunk?.compressedBytes) ??
                    'NA'}
                </strong>
              </Td>
            </Tr>

            <Tr>
              <Tooltip content={t('Total amount of splits')}>
                <Td>Splits:</Td>
              </Tooltip>
              <Td>
                <strong>{logsData?.data.stats.summary?.splits ?? 'NA'}</strong>
              </Td>

              <Tooltip content={t('Total lines read from ingesters head chunks')}>
                <Td>Head Chunk Lines:</Td>
              </Tooltip>
              <Td>
                <strong>
                  {logsData?.data.stats.ingester?.store?.chunk?.headChunkLines ?? 'NA'}
                </strong>
              </Td>

              <Tooltip content={t('Total of duplicates removed from replication')}>
                <Td>Total Duplicates:</Td>
              </Tooltip>
              <Td>
                <strong>
                  {logsData?.data.stats.querier?.store?.chunk?.totalDuplicates ?? 'NA'}
                </strong>
              </Td>
            </Tr>

            <Tr>
              <Tooltip content={t('Total of shards')}>
                <Td>Shards:</Td>
              </Tooltip>
              <Td>
                <strong>{logsData?.data.stats.summary?.shards ?? 'NA'}</strong>
              </Td>

              <Tooltip content={t('Total bytes decompressed and processed by ingesters')}>
                <Td>Decompressed Bytes:</Td>
              </Tooltip>
              <Td>
                <strong>
                  {convertBytes(logsData?.data.stats.ingester?.store?.chunk?.decompressedBytes) ??
                    'NA'}
                </strong>
              </Td>
              <Td></Td>
              <Td></Td>
            </Tr>

            <Tr>
              <Td></Td>
              <Td></Td>
              <Tooltip content={t('Total lines decompressed and processed by ingesters')}>
                <Td>Decompressed Lines:</Td>
              </Tooltip>
              <Td>
                <strong>
                  {logsData?.data.stats.ingester?.store?.chunk?.decompressedLines ?? 'NA'}
                </strong>{' '}
              </Td>
              <Td></Td>
              <Td></Td>
            </Tr>

            <Tr>
              <Td></Td>
              <Td></Td>
              <Tooltip
                content={t('Total bytes of compressed chunks (blocks) processed by ingesters')}
              >
                <Td>Compressed Bytes:</Td>
              </Tooltip>
              <Td>
                <strong>
                  {convertBytes(logsData?.data.stats.ingester?.store?.chunk?.compressedBytes) ??
                    'NA'}
                </strong>
              </Td>
              <Td></Td>
              <Td></Td>
            </Tr>

            <Tr>
              <Td></Td>
              <Td></Td>
              <Tooltip content={t('Total of duplicates found by ingesters')}>
                <Td>Total Duplicates:</Td>
              </Tooltip>
              <Td>
                <strong>
                  {logsData?.data.stats.ingester?.store?.chunk?.totalDuplicates ?? 'NA'}
                </strong>
              </Td>
              <Td></Td>
              <Td></Td>
            </Tr>
          </Tbody>
        </Table>
      </div>
    </div>
  );
};
