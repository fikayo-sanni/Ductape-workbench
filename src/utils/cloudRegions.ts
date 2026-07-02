export type CloudRegionProvider = 'aws' | 'gcp' | 'azure';

export interface CloudRegionOption {
  value: string;
  label: string;
}

export const AWS_REGIONS: CloudRegionOption[] = [
  { value: 'us-east-1', label: 'us-east-1 - N. Virginia' },
  { value: 'us-east-2', label: 'us-east-2 - Ohio' },
  { value: 'us-west-1', label: 'us-west-1 - N. California' },
  { value: 'us-west-2', label: 'us-west-2 - Oregon' },
  { value: 'ca-central-1', label: 'ca-central-1 - Canada Central' },
  { value: 'sa-east-1', label: 'sa-east-1 - São Paulo' },
  { value: 'eu-west-1', label: 'eu-west-1 - Ireland' },
  { value: 'eu-west-2', label: 'eu-west-2 - London' },
  { value: 'eu-west-3', label: 'eu-west-3 - Paris' },
  { value: 'eu-central-1', label: 'eu-central-1 - Frankfurt' },
  { value: 'eu-north-1', label: 'eu-north-1 - Stockholm' },
  { value: 'eu-south-1', label: 'eu-south-1 - Milan' },
  { value: 'ap-northeast-1', label: 'ap-northeast-1 - Tokyo' },
  { value: 'ap-northeast-2', label: 'ap-northeast-2 - Seoul' },
  { value: 'ap-northeast-3', label: 'ap-northeast-3 - Osaka' },
  { value: 'ap-southeast-1', label: 'ap-southeast-1 - Singapore' },
  { value: 'ap-southeast-2', label: 'ap-southeast-2 - Sydney' },
  { value: 'ap-south-1', label: 'ap-south-1 - Mumbai' },
  { value: 'ap-east-1', label: 'ap-east-1 - Hong Kong' },
  { value: 'me-south-1', label: 'me-south-1 - Bahrain' },
  { value: 'af-south-1', label: 'af-south-1 - Cape Town' },
];

export const GCP_REGIONS: CloudRegionOption[] = [
  { value: 'us-central1', label: 'us-central1 - Iowa' },
  { value: 'us-east1', label: 'us-east1 - South Carolina' },
  { value: 'us-east4', label: 'us-east4 - Northern Virginia' },
  { value: 'us-west1', label: 'us-west1 - Oregon' },
  { value: 'us-west2', label: 'us-west2 - Los Angeles' },
  { value: 'us-west3', label: 'us-west3 - Salt Lake City' },
  { value: 'us-west4', label: 'us-west4 - Las Vegas' },
  { value: 'northamerica-northeast1', label: 'northamerica-northeast1 - Montréal' },
  { value: 'southamerica-east1', label: 'southamerica-east1 - São Paulo' },
  { value: 'europe-west1', label: 'europe-west1 - Belgium' },
  { value: 'europe-west2', label: 'europe-west2 - London' },
  { value: 'europe-west3', label: 'europe-west3 - Frankfurt' },
  { value: 'europe-west4', label: 'europe-west4 - Netherlands' },
  { value: 'europe-west6', label: 'europe-west6 - Zurich' },
  { value: 'europe-west9', label: 'europe-west9 - Paris' },
  { value: 'europe-north1', label: 'europe-north1 - Finland' },
  { value: 'asia-east1', label: 'asia-east1 - Taiwan' },
  { value: 'asia-east2', label: 'asia-east2 - Hong Kong' },
  { value: 'asia-northeast1', label: 'asia-northeast1 - Tokyo' },
  { value: 'asia-northeast2', label: 'asia-northeast2 - Osaka' },
  { value: 'asia-northeast3', label: 'asia-northeast3 - Seoul' },
  { value: 'asia-south1', label: 'asia-south1 - Mumbai' },
  { value: 'asia-southeast1', label: 'asia-southeast1 - Singapore' },
  { value: 'asia-southeast2', label: 'asia-southeast2 - Jakarta' },
  { value: 'australia-southeast1', label: 'australia-southeast1 - Sydney' },
];

export const AZURE_REGIONS: CloudRegionOption[] = [
  { value: 'eastus', label: 'eastus - Virginia' },
  { value: 'eastus2', label: 'eastus2 - Virginia' },
  { value: 'westus', label: 'westus - California' },
  { value: 'westus2', label: 'westus2 - Washington' },
  { value: 'westus3', label: 'westus3 - Arizona' },
  { value: 'centralus', label: 'centralus - Iowa' },
  { value: 'northcentralus', label: 'northcentralus - Illinois' },
  { value: 'southcentralus', label: 'southcentralus - Texas' },
  { value: 'canadacentral', label: 'canadacentral - Toronto' },
  { value: 'canadaeast', label: 'canadaeast - Quebec' },
  { value: 'brazilsouth', label: 'brazilsouth - São Paulo' },
  { value: 'northeurope', label: 'northeurope - Ireland' },
  { value: 'westeurope', label: 'westeurope - Netherlands' },
  { value: 'uksouth', label: 'uksouth - London' },
  { value: 'ukwest', label: 'ukwest - Cardiff' },
  { value: 'francecentral', label: 'francecentral - Paris' },
  { value: 'germanywestcentral', label: 'germanywestcentral - Frankfurt' },
  { value: 'switzerlandnorth', label: 'switzerlandnorth - Zurich' },
  { value: 'norwayeast', label: 'norwayeast - Norway' },
  { value: 'swedencentral', label: 'swedencentral - Sweden' },
  { value: 'southafricanorth', label: 'southafricanorth - Johannesburg' },
  { value: 'eastasia', label: 'eastasia - Hong Kong' },
  { value: 'southeastasia', label: 'southeastasia - Singapore' },
  { value: 'japaneast', label: 'japaneast - Tokyo' },
  { value: 'japanwest', label: 'japanwest - Osaka' },
  { value: 'koreacentral', label: 'koreacentral - Seoul' },
  { value: 'australiaeast', label: 'australiaeast - New South Wales' },
  { value: 'australiasoutheast', label: 'australiasoutheast - Victoria' },
  { value: 'centralindia', label: 'centralindia - Pune' },
  { value: 'uaenorth', label: 'uaenorth - Dubai' },
];

export function getCloudRegionOptions(provider: CloudRegionProvider): CloudRegionOption[] {
  if (provider === 'gcp') return GCP_REGIONS;
  if (provider === 'azure') return AZURE_REGIONS;
  return AWS_REGIONS;
}
