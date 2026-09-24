export const NO_TOPO_API: string;
export class NoTopoApiError extends Error { status: number; code: string; nextBidCents: number | null; }
export type ApiPayload = Record<string, unknown>;
export function fetchArenaState(fetchImpl: typeof fetch, baseUrl?: string): Promise<ApiPayload>;
export function createBidSession(fetchImpl: typeof fetch, baseUrl: string | undefined, input: Record<string, unknown>): Promise<ApiPayload>;
export function processBidPayment(fetchImpl: typeof fetch, baseUrl: string | undefined, reservationId: string, formData: Record<string, unknown>): Promise<ApiPayload>;
export function fetchBidStatus(fetchImpl: typeof fetch, baseUrl: string | undefined, reservationId: string): Promise<ApiPayload>;
export function formatCents(cents: number): string;
