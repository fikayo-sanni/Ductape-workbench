export interface Workspace {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Project {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

export interface Header {
  key: string;
  value: string;
  enabled: boolean;
}

export interface QueryParam {
  key: string;
  value: string;
  enabled: boolean;
}

export type BodyType = 'none' | 'json' | 'form-data' | 'x-www-form-urlencoded' | 'raw' | 'binary';

export interface FormDataItem {
  key: string;
  value: string;
  type: 'text' | 'file';
  enabled: boolean;
}

export interface RequestBody {
  type: BodyType;
  raw?: string;
  json?: string;
  formData?: FormDataItem[];
  urlencoded?: QueryParam[];
}

export interface EndpointRequest {
  id: string;
  projectId: string;
  name: string;
  method: HttpMethod;
  url: string;
  headers: Header[];
  queryParams: QueryParam[];
  body: RequestBody;
  createdAt: Date;
  updatedAt: Date;
}

export interface ResponseData {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  data: any;
  time: number;
  size: number;
}

export interface EndpointResponse {
  requestId: string;
  response?: ResponseData;
  error?: string;
  timestamp: Date;
}

export type SdkLanguage = 'typescript' | 'python' | 'go' | 'java';

export interface CodeGenerationOptions {
  language: SdkLanguage;
  includeSdk: boolean;
  includeErrorHandling: boolean;
}

// SDK enums that need to be defined locally due to Vite bundler issues with symlinked packages
export enum TokenPeriods {
  HOURS = 'hours',
  MINUTES = 'mins',
  SECONDS = 'secs',
  DAYS = 'days',
  WEEKS = 'weeks',
  MONTHS = 'months',
  YEARS = 'years'
}
