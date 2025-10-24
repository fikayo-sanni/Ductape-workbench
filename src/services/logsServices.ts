import qs from 'qs';
import apiClient from '@/config/axiosinstance';
import { FetchLogsData, FetchLogsOptions, LogsResponse } from '@/types/logs';

const formatDate = (date: Date) => {
  return date.toISOString().split('T')[0]; // "YYYY-MM-DD"
};

export const fetchLogs = async (
  data: FetchLogsData,
  payload: FetchLogsOptions = {}
): Promise<LogsResponse> => {
  const { workspace_id, user_id, public_key } = data;

  let days = 8;
  if (payload.groupBy === 'month') {
    days = 31;
  }

  if (payload.groupBy === 'day') {
    days = 2;
  }

  if (payload.groupBy === 'year') {
    days = 366;
  }

  const today = new Date();
  const ago = new Date();
  ago.setDate(today.getDate() - days);

  const cleanedPayload = Object.fromEntries(
    Object.entries({
      user_id,
      public_key,
      groupBy: payload.groupBy || 'week',
      start_date: payload.start_date || formatDate(ago),
      end_date: payload.end_date || formatDate(today),
      component: payload.component,
      product_id: payload.product_id,
      product_tag: payload.product_tag,
      parent_tag: payload.parent_tag,
      child_tag: payload.child_tag,
      type: payload.type,
      app_id: payload.app_id,
      env: payload.env,
      app_env: payload.app_env,
      action: payload.action,
      process_id: payload.process_id,
      status: payload.status,
      tag: payload.tag,
      page: payload.page || 1,
      limit: payload.limit || 20,
      ...payload,
    }).filter(([_, value]) => value !== undefined && value !== null)
  );

  const queryString = qs.stringify(cleanedPayload);

  const response = await apiClient.get<LogsResponse>(
    `/log/v1/analytics/${workspace_id}?${queryString}`
  );

  return response.data;
};

const logsServices = {
  fetchLogs,
};

export default logsServices;
