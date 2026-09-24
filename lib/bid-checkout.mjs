export const initialCheckout = { step: "details", reservationId: null, error: null, status: null };

export function checkoutReducer(state, action) {
  switch (action.type) {
    case "reserve": return { ...state, step: "reserving", error: null };
    case "reserved": return { ...state, step: "payment", reservationId: action.reservationId, error: null };
    case "pay": return { ...state, step: "paying", error: null };
    case "status": {
      if (action.status === "approved") return { ...state, step: "approved", status: "approved", error: null };
      if (action.status === "rejected") return { ...state, step: "rejected", status: "rejected", error: "Pagamento recusado." };
      return { ...state, step: "pending", status: action.status, error: null };
    }
    case "error": return { ...state, step: state.reservationId ? "payment" : "details", error: action.message };
    case "reset": return initialCheckout;
    default: return state;
  }
}

export function protectionRemaining(protectedUntil, now = Date.now()) {
  if (!protectedUntil) return 0;
  return Math.max(0, Math.ceil((new Date(protectedUntil).getTime() - now) / 1000));
}
