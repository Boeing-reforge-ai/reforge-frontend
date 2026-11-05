import axios, { AxiosError } from 'axios';

export const api = axios.create({ baseURL: '/api', timeout: 60_000 });

export const getErrorMessage = (e: unknown) =>
  e instanceof AxiosError && typeof e.response?.data?.detail === 'string'
    ? e.response.data.detail
    : document.documentElement.lang === 'ko' ? '요청 중 오류가 발생했습니다.' : 'An error occurred while processing the request.';
