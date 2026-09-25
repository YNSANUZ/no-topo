"use client";

import { FormEvent, useCallback, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import MercadoPagoBrick from "@/components/mercado-pago-brick";
import { createBidSession, formatCents } from "@/lib/no-topo-api.mjs";
import { calculateBidOutcome, type ProtectionRules } from "@/lib/bid-outcome.mjs";

export default function BidCheckoutDialog({ open, onOpenChange, amountCents, nickname, defaultPostUrl, baseBidCents, incrementCents, rules, onApproved }: { open: boolean; onOpenChange: (open: boolean) => void; amountCents: number; nickname: string; defaultPostUrl: string; baseBidCents: number; incrementCents: number; rules: ProtectionRules; onApproved: () => void }) {
  const [reservation, setReservation] = useState<{ reservationId: string; amountCents: number } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const outcome = calculateBidOutcome({ amountCents, baseBidCents, incrementCents, rules });

  const paymentStatus = useCallback((next: string) => {
    setStatus(next);
    if (next === "approved") onApproved();
  }, [onApproved]);

  async function reserve(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const form = new FormData(event.currentTarget);
    try {
      const result = await createBidSession(fetch, undefined, { nickname, email: form.get("email"), postUrl: form.get("postUrl"), amountCents });
      const reservationId = String(result.reservationId);
      sessionStorage.setItem("no-topo-reservation", reservationId);
      setReservation({ reservationId, amountCents: Number(result.amountCents) });
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível reservar o lance."); }
    finally { setBusy(false); }
  }

  return <Dialog open={open} onOpenChange={(next) => { onOpenChange(next); if (!next) { setReservation(null); setStatus(""); setError(""); } }}>
    <DialogContent className="border-white/10 bg-[#0b1017] text-white sm:max-w-lg max-h-[92dvh] overflow-y-auto">
      <DialogHeader><DialogTitle className="text-2xl font-black">Assumir a tela</DialogTitle><DialogDescription className="text-white/50">O pagamento só vale após confirmação do Mercado Pago. O primeiro lugar fica protegido por 10 minutos.</DialogDescription></DialogHeader>
      <div className="demo-price"><small>Seu lance</small><strong>{formatCents(amountCents)}</strong></div>
      <p className="checkout-note">Este valor garante {Math.round(outcome.protectionSeconds / 60)} minutos sem ultrapassagem. Depois, seu destaque permanece até alguém cobrir a partir de {formatCents(outcome.nextBidCents)}; esse mínimo diminui {formatCents(incrementCents)} por hora.</p>
      {!reservation && <form className="checkout-details" onSubmit={reserve}>
        <label className="form-field">Apelido<input value={nickname} readOnly /></label>
        <label className="form-field">Link da publicação<input name="postUrl" type="url" required defaultValue={defaultPostUrl} /></label>
        <label className="form-field">E-mail<input name="email" type="email" required autoComplete="email" placeholder="voce@exemplo.com" /></label>
        {error && <p className="checkout-error" role="alert">{error}</p>}
        <button className="lime-button full" disabled={busy}>{busy ? "RESERVANDO..." : "CONTINUAR PARA O PAGAMENTO"}</button>
      </form>}
      {reservation && status !== "approved" && <MercadoPagoBrick reservationId={reservation.reservationId} amountCents={reservation.amountCents} onStatus={paymentStatus} />}
      {status === "approved" && <div className="checkout-success"><strong>Você está no topo!</strong><span>Pagamento aprovado. A arena será atualizada agora.</span></div>}
      {status && status !== "approved" && <p className="checkout-note">Status: {status}. A confirmação pode levar alguns instantes.</p>}
    </DialogContent>
  </Dialog>;
}
