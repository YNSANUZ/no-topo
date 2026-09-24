export const NO_TOPO_API = "https://primusdf.com.br/_no_topo_backend/api";

export class NoTopoApiError extends Error {
  constructor(message, { status = 0, code = "api_error", nextBidCents = null } = {}) {
    super(message);
    this.name = "NoTopoApiError";
    this.status = status;
    this.code = code;
    this.nextBidCents = nextBidCents;
  }
}

async function request(fetchImpl, url, options = {}) {
  let response;
  try {
    response = await fetchImpl(url, { cache: "no-store", signal: AbortSignal.timeout(10000), ...options });
  } catch (error) {
    throw new NoTopoApiError(error?.name === "TimeoutError" ? "A conexão demorou demais." : "Não foi possível conectar à arena.", { code: error?.name === "TimeoutError" ? "timeout" : "unavailable" });
  }
  let payload;
  try { payload = await response.json(); } catch { throw new NoTopoApiError("A arena enviou uma resposta inválida.", { status: response.status, code: "invalid_response" }); }
  if (!response.ok) {
    throw new NoTopoApiError(payload.error || "Não foi possível concluir a solicitação.", {
      status: response.status,
      code: response.status === 409 ? "bid_changed" : "api_error",
      nextBidCents: Number.isInteger(payload.nextBidCents) ? payload.nextBidCents : null,
    });
  }
  return payload;
}

const endpoint = (baseUrl, path) => `${baseUrl.replace(/\/$/, "")}/${path}`;
export const fetchArenaState = (fetchImpl, baseUrl = NO_TOPO_API) => request(fetchImpl, endpoint(baseUrl, "arena-state.php"));
export const createBidSession = (fetchImpl, baseUrl = NO_TOPO_API, input) => request(fetchImpl, endpoint(baseUrl, "create-bid-session.php"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
export const processBidPayment = (fetchImpl, baseUrl = NO_TOPO_API, reservationId, formData) => request(fetchImpl, endpoint(baseUrl, "process-bid-payment.php"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reservationId, formData }) });
export const fetchBidStatus = (fetchImpl, baseUrl = NO_TOPO_API, reservationId) => request(fetchImpl, `${endpoint(baseUrl, "bid-status.php")}?reservationId=${encodeURIComponent(reservationId)}`);
export const formatCents = (cents) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
