import api from '../../../shared/api/axiosInstance';

// The shared axios instance resolves with the response body ({ success, message, data });
// the CMS screens read `res.data.*`, so re-wrap the body into that shape.
const wrap = (body) => ({ data: body });

export const pageEndpoint = (key) => `/admin/pages/${key}`;

export const cmsApi = {
  get: (url) => api.get(url).then(wrap),
  put: (url, payload) => api.put(url, payload).then(wrap),
};

export const businessSettingsApi = {
  get: () => api.get('/admin/business-settings').then((body) => body?.data || {}),
  update: (data, files = {}) => {
    const form = new FormData();
    form.append('data', JSON.stringify(data));
    if (files.logo) form.append('logo', files.logo);
    if (files.favicon) form.append('favicon', files.favicon);
    return api.patch('/admin/business-settings', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};
