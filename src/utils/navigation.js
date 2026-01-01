// Navigation utility for React Router Native
export const navigateWithParams = (navigate, path, params = {}) => {
  navigate(path, { state: params });
};

export const getRouteParams = (location) => {
  return location?.state || {};
};