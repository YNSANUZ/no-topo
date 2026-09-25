"use client";

import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { bidAmountForMinutes, calculateBidOutcome, type ProtectionRules } from "@/lib/bid-outcome.mjs";
import { formatCents } from "@/lib/no-topo-api.mjs";

const duration = (seconds: number) => seconds >= 3600 ? "60 minutos" : `${Math.round(seconds / 60)} minutos`;
const time = (iso: string) => new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

export default function BidOutcomeDialog({ open, onOpenChange, amountCents, onAmountChange, minimumCents, baseBidCents, incrementCents, rules }: { open: boolean; onOpenChange: (open: boolean) => void; amountCents: number; onAmountChange: (amount: number) => void; minimumCents: number; baseBidCents: number; incrementCents: number; rules: ProtectionRules }) {
  const [more, setMore] = useState(false);
  const outcome = useMemo(() => calculateBidOutcome({ amountCents, baseBidCents, incrementCents, rules }), [amountCents, baseBidCents, incrementCents, rules]);
  const chooseMinutes = (minutes: number) => onAmountChange(Math.max(minimumCents, bidAmountForMinutes(minutes, { baseBidCents, incrementCents, rules })));
  const extraValues = [...new Set([100000, 250000, 500000, 1000000].map((value) => Math.max(value, minimumCents)))];

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="border-white/10 bg-[#0b1017] text-white sm:max-w-lg max-h-[92dvh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="text-2xl font-black">O que acontece com este lance?</DialogTitle>
        <DialogDescription className="text-white/55">A disputa é contínua e não reinicia à meia-noite.</DialogDescription>
      </DialogHeader>
      <div className="demo-price"><small>Valor escolhido</small><strong>{formatCents(amountCents)}</strong></div>
      <div className="grid gap-2 text-sm">
        <p className="m-0 rounded-xl bg-white/5 p-3"><b className="text-[#b9ff38]">1.</b> Após a aprovação, você assume o telão.</p>
        <p className="m-0 rounded-xl bg-white/5 p-3"><b className="text-[#b9ff38]">2.</b> Ninguém poderá ultrapassá-lo por <strong>{duration(outcome.protectionSeconds)}</strong>, aproximadamente até <strong>{time(outcome.protectedUntil)}</strong>.</p>
        <p className="m-0 rounded-xl bg-white/5 p-3"><b className="text-[#b9ff38]">3.</b> Depois, você continua no telão, mas o próximo valor começa em <strong>{formatCents(outcome.nextBidCents)}</strong>.</p>
        <p className="m-0 rounded-xl bg-white/5 p-3"><b className="text-[#b9ff38]">4.</b> Sem novos pagamentos, o valor necessário cai {formatCents(incrementCents)} por hora até chegar ao mínimo de {formatCents(baseBidCents)}.</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {[10,20,30,60].map((minutes) => <button key={minutes} type="button" onClick={() => chooseMinutes(minutes)} className="rounded-xl border border-white/10 bg-white/5 p-3 text-left hover:border-[#b9ff38]/60"><small className="block text-white/45">Proteção</small><strong>{minutes} minutos</strong></button>)}
      </div>
      <button type="button" className="rounded-xl border border-[#b9ff38]/35 p-3 font-black text-[#b9ff38]" onClick={() => setMore((value) => !value)}>{more ? "OCULTAR VALORES MAIORES" : "PAGAR MAIS"}</button>
      {more && <div className="grid grid-cols-2 gap-2">
        {extraValues.map((value) => <button key={value} type="button" onClick={() => onAmountChange(value)} className="rounded-xl bg-[#b9ff38]/10 p-3 font-black text-[#b9ff38]">{formatCents(value)}</button>)}
        <p className="col-span-2 m-0 text-xs text-white/45">Valores acima de {formatCents(bidAmountForMinutes(60, { baseBidCents, incrementCents, rules }))} mantêm o limite de 60 minutos de proteção, mas elevam a barreira que o próximo participante precisa cobrir.</p>
      </div>}
      <button type="button" className="lime-button full" onClick={() => onOpenChange(false)}>USAR {formatCents(amountCents)}</button>
    </DialogContent>
  </Dialog>;
}
