"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import MercadoPagoBrick from "@/components/mercado-pago-brick";
import { createBidSession, formatCents } from "@/lib/no-topo-api.mjs";
import { bidAmountForMinutes, calculateBidOutcome, type ProtectionRules } from "@/lib/bid-outcome.mjs";
import { normalizeNickname } from "@/lib/player-identity.mjs";

export default function BidCheckoutDialog({ open, onOpenChange, amountCents, onAmountChange, minimumCents, nickname, onNicknameChange, defaultPostUrl, baseBidCents, incrementCents, rules, onApproved }: { open: boolean; onOpenChange: (open: boolean) => void; amountCents: number; onAmountChange: (amount: number) => void; minimumCents: number; nickname: string; onNicknameChange: (nickname: string) => void; defaultPostUrl: string; baseBidCents: number; incrementCents: number; rules: ProtectionRules; onApproved: () => void }) {
  const [reservation, setReservation] = useState<{ reservationId: string; amountCents: number } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [showProtectionOptions, setShowProtectionOptions] = useState(false);
  const [nicknameDraft, setNicknameDraft] = useState(nickname);
  const outcome = calculateBidOutcome({ amountCents, baseBidCents, incrementCents, rules });
  const chooseProtection = (minutes: number) => onAmountChange(Math.max(minimumCents, bidAmountForMinutes(minutes, { baseBidCents, incrementCents, rules })));

  useEffect(() => {
    if (open) setNicknameDraft(nickname);
  }, [open, nickname]);

  const paymentStatus = useCallback((next: string) => {
    setStatus(next);
    if (next === "approved") onApproved();
  }, [onApproved]);

  async function reserve(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const form = new FormData(event.currentTarget);
    const normalized = normalizeNickname(nicknameDraft, nickname);
    if (!normalized.allowed) {
      setBusy(false);
      setError(normalized.reason === "email" ? "Não use e-mail no apelido." : normalized.reason === "numbers" ? "Não use números de contato no apelido." : normalized.reason === "link" ? "Não use links no apelido." : "Escolha outro apelido.");
      return;
    }
    try {
      onNicknameChange(normalized.nickname);
      window.localStorage.setItem("no-topo-player-nickname", normalized.nickname);
      const result = await createBidSession(fetch, undefined, { nickname: normalized.nickname, email: form.get("email"), postUrl: form.get("postUrl"), amountCents });
      const reservationId = String(result.reservationId);
      sessionStorage.setItem("no-topo-reservation", reservationId);
      setReservation({ reservationId, amountCents: Number(result.amountCents) });
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível reservar o lance."); }
    finally { setBusy(false); }
  }

  return <Dialog open={open} onOpenChange={(next) => { onOpenChange(next); if (!next) { setReservation(null); setStatus(""); setError(""); setShowProtectionOptions(false); } }}>
    <DialogContent className="border-white/10 bg-[#0b1017] text-white sm:max-w-lg max-h-[92dvh] overflow-y-auto">
      <DialogHeader><DialogTitle className="text-2xl font-black">Assumir a tela</DialogTitle><DialogDescription className="text-white/50">O pagamento só vale após confirmação do Mercado Pago. O primeiro lugar fica protegido por 10 minutos.</DialogDescription></DialogHeader>
      <div className="demo-price"><small>Seu lance</small><strong>{formatCents(amountCents)}</strong></div>
      <p className="checkout-note">Este valor garante {Math.round(outcome.protectionSeconds / 60)} minutos sem ultrapassagem. Depois, seu destaque permanece até alguém cobrir a partir de {formatCents(outcome.nextBidCents)}; esse mínimo diminui {formatCents(incrementCents)} por hora.</p>
      {!reservation && <div className="protection-upsell">
        <button type="button" aria-expanded={showProtectionOptions} onClick={() => setShowProtectionOptions((value) => !value)}>{showProtectionOptions ? "Ocultar opções" : "Quero mais tempo de proteção"}</button>
        {showProtectionOptions && <div className="protection-options">
          {[10, 20, 30, 60].map((minutes) => {
            const value = Math.max(minimumCents, bidAmountForMinutes(minutes, { baseBidCents, incrementCents, rules }));
            return <button type="button" key={minutes} className={amountCents === value ? "selected" : ""} onClick={() => chooseProtection(minutes)}><strong>{minutes} min</strong><span>{formatCents(value)}</span></button>;
          })}
          <small>Quanto maior o valor, maior a proteção e a barreira inicial para ultrapassá-lo. Proteção máxima: 60 minutos.</small>
        </div>}
      </div>}
      {!reservation && <form className="checkout-details" onSubmit={reserve}>
        <label className="form-field">Apelido<input value={nicknameDraft} maxLength={20} autoComplete="nickname" onChange={(event) => { setNicknameDraft(event.target.value); if (error) setError(""); }} /></label>
        <label className="form-field">Link da publicação<input name="postUrl" type="url" required defaultValue={defaultPostUrl} /></label>
        <label className="form-field">E-mail<input name="email" type="email" required autoComplete="email" placeholder="voce@exemplo.com" /><small>Para recibo, suporte e identificação da compra. Não será exibido.</small></label>
        {error && <p className="checkout-error" role="alert">{error}</p>}
        <button className="lime-button full" disabled={busy}>{busy ? "RESERVANDO..." : "CONTINUAR PARA O PAGAMENTO"}</button>
      </form>}
      {reservation && status !== "approved" && <MercadoPagoBrick reservationId={reservation.reservationId} amountCents={reservation.amountCents} onStatus={paymentStatus} />}
      {status === "approved" && <div className="checkout-success"><strong>Você está no topo!</strong><span>Pagamento aprovado. A arena será atualizada agora.</span></div>}
      {status && status !== "approved" && <p className="checkout-note">Status: {status}. A confirmação pode levar alguns instantes.</p>}
    </DialogContent>
  </Dialog>;
}
