/** Local graph schema types (mirrors @ductape/sdk graph types for workbench UI). */

export type GraphPropertyType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'array'
  | 'point'
  | 'object'
  | 'unknown';

export interface IGraphLabelProperty {
  name: string;
  type: GraphPropertyType;
  required?: boolean;
}

export interface IGraphLabel {
  name: string;
  count: number;
  properties: IGraphLabelProperty[];
  color?: string;
}

export interface IGraphRelationshipType {
  type: string;
  count: number;
  fromLabels?: string[];
  toLabels?: string[];
  properties?: IGraphLabelProperty[];
}

export interface IGraphIndex {
  name: string;
  labelOrType: string;
  properties: string[];
  unique: boolean;
  type: string;
  state?: string;
}

export interface IGraphConstraint {
  name: string;
  label: string;
  property: string;
  type: string;
}

export type GraphActionParameterType = 'string' | 'number' | 'boolean' | 'array' | 'object';

export interface IGraphActionParameter {
  name: string;
  path: string;
  defaultValue: unknown;
  type: GraphActionParameterType;
  description?: string;
  required?: boolean;
}

export interface IGraphAction {
  id: string;
  tag: string;
  name: string;
  description?: string;
  operation: string;
  query: Record<string, unknown>;
  parameters: IGraphActionParameter[];
  createdAt: string;
  updatedAt?: string;
  graphTag?: string;
}
