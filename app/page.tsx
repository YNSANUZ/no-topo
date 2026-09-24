"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Minus, Plus, Send } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { featuredPost } from "@/lib/featured-post.mjs";
import { moderateMessage } from "@/lib/chat-moderation.mjs";

const Arena = dynamic(() => import("@/components/arena-3d"), { ssr: false });
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export default function Home() {
  const [offer, setOffer] = useState(1800);
  const [open, setOpen] = useState(false);
  const [remaining, setRemaining] = useState("02:14:37");
  const [target] = useState(() => Date.now() + 8077000);
  const [chatText, setChatText] = useState("");
  const playerNickname = "Visitante 482";
  const playerColor = "#b9ff38";
  const [chatMessages, setChatMessages] = useState<Array<{ id: number; text: string; nickname: string; color: string }>>([]);
  const [chatError, setChatError] = useState("");
  const chatInputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    const focusChatOnEnter = (event: KeyboardEvent) => {
      if (event.key !== "Enter" || event.repeat) return;
      const active = document.activeElement;
      if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement || active instanceof HTMLButtonElement) return;
      event.preventDefault();
      chatInputRef.current?.focus();
    };
    window.addEventListener("keydown", focusChatOnEnter);
    return () => window.removeEventListener("keydown", focusChatOnEnter);
  }, []);

  const publishMessage = (text: string) => {
    const message = { id: Date.now(), text, nickname: playerNickname, color: playerColor };
    setChatMessages((current) => [...current.slice(-3), message]);
  };

  return <main className="app-shell">
    <Arena countdown={remaining} playerNickname={playerNickname} onQuickMessage={publishMessage} />
    <div className="vignette" />
    <header className="topbar glass">
      <a className="brand" href="#" aria-label="No Topo"><span className="brand-mark">↗</span><b>NO TOPO</b></a>
      <nav><a href="#como">Como funciona</a><a href="#ranking">Ranking</a><a href="#recordes">Recordes</a></nav>
      <div className="live"><span /> 127 ONLINE</div>
      <button className="lime-button small" onClick={() => setOpen(true)}>DAR UM LANCE</button>
    </header>

    <section className="status-card glass" aria-label="Destaque atual">
      <div className="eyebrow"><ArrowUpRight size={14}/> DESTAQUE ATUAL</div>
      <strong>{featuredPost.username}</strong>
      <div className="status-row"><span>Lance atual</span><b>R$ 1.780</b></div>
      <div className="status-row"><span>Termina em</span><b className="timer">{remaining}</b></div>
      <a className="post-link" href={featuredPost.url} target="_blank" rel="noreferrer">VER REEL NO INSTAGRAM <ArrowUpRight size={13}/></a>
    </section>

    <div className="hint glass"><ArrowUpRight size={18}/><span>clique para andar ou sentar</span><i/> <span>arraste para girar</span></div>

    <div className="chat-area">
      <div className="chat-feed" aria-live="polite">
        {chatMessages.map((message) => <div className="chat-line" key={message.id}>
          <strong style={{ color: message.color }}>{message.nickname}</strong><span>{message.text}</span>
        </div>)}
      </div>
    <form className="chatbox glass" onSubmit={(event) => {
      event.preventDefault();
      const text = chatText.trim();
      if (!text) return;
      const moderation = moderateMessage(text);
      if (!moderation.allowed) {
        setChatError(moderation.reason === "email" ? "E-mails não são permitidos." : moderation.reason === "numbers" ? "Não compartilhe números de contato." : "Essa palavra não é permitida.");
        return;
      }
      setChatError(""); publishMessage(text); setChatText("");
    }}>
      <input ref={chatInputRef} value={chatText} onChange={(event) => { setChatText(event.target.value); if (chatError) setChatError(""); }} maxLength={80} aria-label="Mensagem" aria-describedby="chat-error" placeholder="Diga algo... (Enter)" />
      <button type="submit" aria-label="Enviar mensagem"><Send size={17}/></button>
      {chatError && <span id="chat-error" className="chat-error" role="alert">{chatError}</span>}
    </form>
    </div>

    <section className="bidbar glass">
      <div className="bid-caption"><span>Seu próximo lance</span><small>mínimo de R$ 20</small></div>
      <div className="stepper"><button onClick={() => setOffer(Math.max(1800, offer - 20))} aria-label="Diminuir"><Minus/></button><b>{money.format(offer)}</b><button onClick={() => setOffer(offer + 20)} aria-label="Aumentar"><Plus/></button></div>
      <button className="lime-button" onClick={() => setOpen(true)}>ASSUMIR A TELA <ArrowUpRight/></button>
    </section>

    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="border-white/10 bg-[#0b1017] text-white sm:max-w-lg">
        <DialogHeader><DialogTitle className="text-2xl font-black">Assumir a tela</DialogTitle><DialogDescription className="text-white/50">Protótipo seguro: nenhuma cobrança real será realizada.</DialogDescription></DialogHeader>
        <div className="demo-price"><small>Seu lance demonstrativo</small><strong>{money.format(offer)}</strong></div>
        <label className="form-field">Perfil<input defaultValue={featuredPost.username} /></label>
        <label className="form-field">Link da publicação<input defaultValue={featuredPost.url} /></label>
        <label className="form-field">E-mail<input type="email" placeholder="voce@exemplo.com" /></label>
        <button className="lime-button full" onClick={() => setOpen(false)}>SIMULAR ENTRADA NA DISPUTA</button>
      </DialogContent>
    </Dialog>
  </main>;
}
