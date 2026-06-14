import appServices from './appServices';

interface FetchAppsParams {
  workspace_id: string;
  user_id: string;
  public_key: string;
  status: string;
}

interface FetchAppByTagParams {
  tag: string;
  user_id: string;
  public_key: string;
}

interface FetchAppParams {
  app_id: string;
  user_id: string;
  public_key: string;
}

interface FetchWorkspaceAppsParams {
  workspace_id: string;
  user_id: string;
  public_key: string;
}

const appServicesReal = {
  fetchApps: async (params: FetchAppsParams) => {
    return await appServices.fetchApps(params);
  },

  fetchAppByTag: async (params: FetchAppByTagParams) => {
    return await appServices.fetchAppByTag(params);
  },

  fetchApp: async (params: FetchAppParams) => {
    return await appServices.fetchApp(params);
  },

  fetchWorkspaceApps: async (params: FetchWorkspaceAppsParams) => {
    return await appServices.fetchWorkspaceApps(params);
  },

  listReviewFeedback: appServices.listReviewFeedback,
  postReviewFeedback: appServices.postReviewFeedback,
};

export default appServicesReal;

