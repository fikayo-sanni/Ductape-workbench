import logsServices from './logsServices';

interface FetchLogsParams {
  workspace_id: string;
  user_id: string;
  public_key: string;
  page?: number;
  limit?: number;
}

const logsServicesReal = {
  fetchLogs: async (params: FetchLogsParams) => {
    return await logsServices.fetchLogs(params);
  },
};

export default logsServicesReal;

