import axios, { AxiosError } from 'axios';

export const api = axios.create({ baseURL: '/api', timeout: 60_000 });

export const getErrorMessage = (e: unknown) =>
  e instanceof AxiosError && typeof e.response?.data?.detail === 'string'
    ? e.response.data.detail
    : '요청 중 오류가 발생했습니다.';
