import axios from 'axios';

// The hosted licence service is mounted under the pricing service.
const CLOUD_API = 'https://api.ductape.app/pricing/v1';

const licenseServices = {
  activateLicense: (data: { activation_code: string; instance_url: string }) =>
    axios.post(`${CLOUD_API}/licenses/v1/activate`, data),
  validateLicense: (activation_code: string) =>
    axios.get(`${CLOUD_API}/licenses/v1/validate`, { params: { activation_code } }),
};

export default licenseServices;
