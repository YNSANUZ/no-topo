"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { ArrowUpRight, Minus, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const Arena = dynamic(() => import("@/components/arena-3d"), { ssr: false });
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export default function Home() {
  const [offer, setOffer] = useState(1800);
  const [open, setOpen] = useState(false);
  const [remaining, setRemaining] = useState("02:14:37");
  const [target] = useState(() => Date.now() + 8077000);

  useEffect(() => {
    const tick = () => {
      const seconds = Math.max(0, Math.floor((target - Date.now()) / 1000));
      const h = String(Math.floor(seconds / 3600)).padStart(2, "0");
      const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
      const s = String(seconds % 60).padStart(2, "0");
      setRemaining(`${h}:${m}:${s}`);
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [target]);

  return <main className="app-shell">
    <Arena countdown={remaining} />
    <div className="vignette" />
    <header className="topbar glass">
      <a className="brand" href="#" aria-label="No Topo"><span className="brand-mark">↗</span><b>NO TOPO</b></a>
      <nav><a href="#como">Como funciona</a><a href="#ranking">Ranking</a><a href="#recordes">Recordes</a></nav>
      <div className="live"><span /> 127 ONLINE</div>
      <button className="lime-button small" onClick={() => setOpen(true)}>DAR UM LANCE</button>
    </header>

    <section className="status-card glass" aria-label="Destaque atual">
      <div className="eyebrow"><ArrowUpRight size={14}/> DESTAQUE ATUAL</div>
      <strong>@studioaurora</strong>
      <div className="status-row"><span>Lance atual</span><b>R$ 1.780</b></div>
      <div className="status-row"><span>Termina em</span><b className="timer">{remaining}</b></div>
    </section>

    <div className="hint glass"><ArrowUpRight size={18}/><span>arraste para girar</span><i/> <span>scroll para zoom</span></div>

    <section className="bidbar glass">
      <div className="bid-caption"><span>Seu próximo lance</span><small>mínimo de R$ 20</small></div>
      <div className="stepper"><button onClick={() => setOffer(Math.max(1800, offer - 20))} aria-label="Diminuir"><Minus/></button><b>{money.format(offer)}</b><button onClick={() => setOffer(offer + 20)} aria-label="Aumentar"><Plus/></button></div>
      <button className="lime-button" onClick={() => setOpen(true)}>ASSUMIR A TELA <ArrowUpRight/></button>
    </section>

    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="border-white/10 bg-[#0b1017] text-white sm:max-w-lg">
        <DialogHeader><DialogTitle className="text-2xl font-black">Assumir a tela</DialogTitle><DialogDescription className="text-white/50">Protótipo seguro: nenhuma cobrança real será realizada.</DialogDescription></DialogHeader>
        <div className="demo-price"><small>Seu lance demonstrativo</small><strong>{money.format(offer)}</strong></div>
        <label className="form-field">Perfil<input defaultValue="@seuperfil" /></label>
        <label className="form-field">Link da publicação<input placeholder="https://instagram.com/p/..." /></label>
        <label className="form-field">E-mail<input type="email" placeholder="voce@exemplo.com" /></label>
        <button className="lime-button full" onClick={() => setOpen(false)}>SIMULAR ENTRADA NA DISPUTA</button>
      </DialogContent>
    </Dialog>
  </main>;
}
