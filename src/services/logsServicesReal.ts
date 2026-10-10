import logsServices from './logsServices';
import { FetchLogsData, FetchLogsOptions } from '../types/logs';

const logsServicesReal = {
  fetchLogs: async (data: FetchLogsData, payload: FetchLogsOptions = {}) => {
    return await logsServices.fetchLogs(data, payload);
  },
  fetchWorkspaceLogs: async (data: FetchLogsData, payload: FetchLogsOptions = {}) => {
    return await logsServices.fetchWorkspaceLogs(data, payload);
  },
};

export default logsServicesReal;

