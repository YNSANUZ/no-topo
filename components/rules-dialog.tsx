"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatCents } from "@/lib/no-topo-api.mjs";

export default function RulesDialog({ open, onOpenChange, username, winningBidCents, nextBidCents, incrementCents, protectionActive }: { open: boolean; onOpenChange: (open: boolean) => void; username: string; winningBidCents: number; nextBidCents: number; incrementCents: number; protectionActive: boolean }) {
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="border-white/10 bg-[#0b1017] text-white sm:max-w-lg">
      <DialogHeader>
        <DialogTitle className="text-2xl font-black">Como funciona</DialogTitle>
        <DialogDescription className="text-white/55">O valor da conquista e o preço atual podem ser diferentes.</DialogDescription>
      </DialogHeader>
      <div className="rules-current">
        <small>Situação atual</small>
        <strong>{username} conquistou o topo com {formatCents(winningBidCents)}</strong>
        <span>{protectionActive ? `A proteção está ativa. Depois dela, o próximo lance começa em ${formatCents(nextBidCents)}.` : `A proteção terminou. Agora ${formatCents(nextBidCents)} assume a tela.`}</span>
      </div>
      <div className="rules-list">
        <p><b>1.</b><span>O valor no telão registra quanto aquela pessoa pagou para conquistar a posição.</span></p>
        <p><b>2.</b><span>R$ 20 garantem 10 minutos protegidos. Valores maiores aumentam a proteção, até o máximo de 60 minutos.</span></p>
        <p><b>3.</b><span>Quando a proteção acaba, o post continua no telão, mas já pode ser substituído.</span></p>
        <p><b>4.</b><span>Sem novo vencedor, o mínimo diminui {formatCents(incrementCents)} por hora até voltar a R$ 20.</span></p>
      </div>
      <button type="button" className="lime-button full" onClick={() => onOpenChange(false)}>ENTENDI</button>
    </DialogContent>
  </Dialog>;
}
