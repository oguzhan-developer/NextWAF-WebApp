import Cookies from 'js-cookie';

export const setCookie = (name, value, options = {}) => {
  Cookies.set(name, value, options);
};

export const getCookie = (name) => {
  return Cookies.get(name);
};

export const getCookieJSON = (name) => {
  const value = Cookies.get(name);
  return value ? JSON.parse(value) : null;
};

export const removeCookie = (name) => {
  Cookies.remove(name);
};
