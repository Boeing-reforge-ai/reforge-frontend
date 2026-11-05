import axios, { AxiosError } from 'axios';

export const api = axios.create({ baseURL: '/api', timeout: 60_000 });

// 현재 화면 언어를 백엔드에 알려 AI 문구·오류 메시지를 같은 언어로 받는다
api.interceptors.request.use((config) => {
  config.headers.set('Accept-Language', document.documentElement.lang === 'ko' ? 'ko' : 'en');
  return config;
});
export const getErrorMessage = (e: unknown) =>
  e instanceof AxiosError && typeof e.response?.data?.detail === 'string'
    ? e.response.data.detail
    : document.documentElement.lang === 'ko' ? '요청 중 오류가 발생했습니다.' : 'An error occurred while processing the request.';
