// Phase 1 placeholder contracts. Phase 2 replaces these with Zod schemas
// (envelope, error codes, pagination) per §10.1 of the plan.

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface HealthDto {
  status: 'ok' | 'degraded';
  uptime: number;
}
