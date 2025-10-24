import logsServices from './logsServices';
import { FetchLogsData, FetchLogsOptions } from '../types/logs';

const logsServicesReal = {
  fetchLogs: async (data: FetchLogsData, payload: FetchLogsOptions = {}) => {
    return await logsServices.fetchLogs(data, payload);
  },
};

export default logsServicesReal;

