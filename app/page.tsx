"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUpRight, Minus, Plus, Send } from "lucide-react";
import BidCheckoutDialog from "@/components/bid-checkout-dialog";
import BidOutcomeDialog from "@/components/bid-outcome-dialog";
import RulesDialog from "@/components/rules-dialog";
import { moderateMessage } from "@/lib/chat-moderation.mjs";
import { createVisitorNickname, normalizeNickname } from "@/lib/player-identity.mjs";
import { fetchArenaState, formatCents } from "@/lib/no-topo-api.mjs";
import { arenaViewFromState, demoArenaView } from "@/lib/live-arena.mjs";
import { buildArenaTicker } from "@/lib/arena-ticker.mjs";
import { roomGuideReply } from "@/lib/room-guide.mjs";

const Arena = dynamic(() => import("@/components/arena-3d"), { ssr: false });
export default function Home() {
  const [offer, setOffer] = useState(2000);
  const [open, setOpen] = useState(false);
  const [outcomeOpen, setOutcomeOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [remaining, setRemaining] = useState("00:00:00");
  const [arenaView, setArenaView] = useState(demoArenaView);
  const [chatText, setChatText] = useState("");
  const [playerNickname, setPlayerNickname] = useState("Visitante 482");
  const [nicknameOpen, setNicknameOpen] = useState(false);
  const [nicknameDraft, setNicknameDraft] = useState("");
  const [nicknameError, setNicknameError] = useState("");
  const [onboarding, setOnboarding] = useState(true);
  const playerColor = "#b9ff38";
  const [chatMessages, setChatMessages] = useState<Array<{ id: number; text: string; nickname: string; color: string }>>([]);
  const [chatError, setChatError] = useState("");
  const chatInputRef = useRef<HTMLInputElement>(null);
  const guideReplyTimer = useRef<number | null>(null);
  const openCheckout = useCallback(() => {
    setOffer(arenaView.nextBidCents);
    setOpen(true);
  }, [arenaView.nextBidCents]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const stored = window.localStorage.getItem("no-topo-player-nickname");
      const fallback = window.localStorage.getItem("no-topo-visitor-name") || createVisitorNickname();
      window.localStorage.setItem("no-topo-visitor-name", fallback);
      setPlayerNickname(stored || fallback);
      setOnboarding(window.localStorage.getItem("no-topo-player-onboarded") !== "1");
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const openNickname = useCallback(() => { setNicknameDraft(""); setNicknameError(""); setNicknameOpen(true); }, []);
  const dismissOnboarding = useCallback(() => {
    setOnboarding(false);
    window.localStorage.setItem("no-topo-player-onboarded", "1");
  }, []);

  const refreshArena = useCallback(async () => {
    try {
      const state = await fetchArenaState(fetch);
      setArenaView((current) => {
        const next = arenaViewFromState(state, current);
        setOffer((value) => Math.max(value, next.nextBidCents));
        return next;
      });
    } catch { /* Preserve the last known good arena while connectivity recovers. */ }
  }, []);

  useEffect(() => {
    const initial = window.setTimeout(() => void refreshArena(), 0);
    const poll = window.setInterval(() => { if (!document.hidden) void refreshArena(); }, 10000);
    return () => { window.clearTimeout(initial); window.clearInterval(poll); };
  }, [refreshArena]);

  useEffect(() => {
    const tick = () => {
      const target = arenaView.protectedUntil ? new Date(arenaView.protectedUntil).getTime() : Date.now();
      const seconds = Math.max(0, Math.floor((target - Date.now()) / 1000));
      const h = String(Math.floor(seconds / 3600)).padStart(2, "0");
      const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
      const s = String(seconds % 60).padStart(2, "0");
      setRemaining(`${h}:${m}:${s}`);
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [arenaView.protectedUntil]);

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

  const publishMessage = useCallback((text: string) => {
    const message = { id: Date.now(), text, nickname: playerNickname, color: playerColor };
    setChatMessages((current) => [...current.slice(-3), message]);
    if (guideReplyTimer.current) window.clearTimeout(guideReplyTimer.current);
    guideReplyTimer.current = window.setTimeout(() => {
      const reply = { id: Date.now() + 1, text: roomGuideReply(text), nickname: "Guia da sala", color: "#78d7ff" };
      setChatMessages((current) => [...current.slice(-3), reply]);
      guideReplyTimer.current = null;
    }, 1800 + Math.floor(Math.random() * 2400));
  }, [playerNickname]);

  useEffect(() => () => { if (guideReplyTimer.current) window.clearTimeout(guideReplyTimer.current); }, []);

  return <main className="app-shell">
    <Arena countdown={remaining} featured={arenaView.featured} podium={arenaView.podium} playerNickname={playerNickname} onboarding={onboarding} onQuickMessage={publishMessage} onNicknameRequest={openNickname} onPlayerLocated={dismissOnboarding} />
    <div className="vignette" />
    <header className="topbar glass">
      <a className="brand" href="#" aria-label="No Topo"><span className="brand-mark">↗</span><b>NO TOPO</b></a>
      <nav><button type="button" onClick={() => setRulesOpen(true)}>Como funciona</button><a href="#ranking">Ranking</a><a href="#recordes">Recordes</a></nav>
      <div className="live"><span /> 127 ONLINE</div>
      <button className="lime-button small" disabled={remaining !== "00:00:00"} onClick={openCheckout}>DAR UM LANCE</button>
    </header>

    <section className="status-card glass" aria-label="Destaque atual">
      <div className="eyebrow"><ArrowUpRight size={14}/> DESTAQUE ATUAL</div>
      <strong>{arenaView.featured.username}</strong>
      <div className="status-row"><span>Lance atual</span><b>{formatCents(arenaView.featured.bid)}</b></div>
      <div className="status-row"><span>Proteção</span><b className="timer">{remaining}</b></div>
      <a className="post-link" href={arenaView.featured.url} target="_blank" rel="noreferrer">VER REEL NO INSTAGRAM <ArrowUpRight size={13}/></a>
    </section>

    <div className="hint glass"><ArrowUpRight size={18}/><span>clique para andar ou sentar</span><i/> <span>arraste para girar</span></div>

    {!onboarding && <button className="locate-player glass" type="button" onClick={() => setOnboarding(true)}>Onde estou?</button>}

    {nicknameOpen && <div className="nickname-card glass" role="dialog" aria-modal="true" aria-labelledby="nickname-title">
      <strong id="nickname-title">Escolha seu apelido</strong>
      <small>Os outros visitantes verão este nome. Você poderá trocá-lo depois clicando no seu boneco.</small>
      <form onSubmit={(event) => {
        event.preventDefault();
        const result = normalizeNickname(nicknameDraft, playerNickname);
        if (!result.allowed) {
          setNicknameError(result.reason === "email" ? "Não use e-mail." : result.reason === "numbers" ? "Não use números de contato." : result.reason === "link" ? "Não use links." : "Escolha outro apelido.");
          return;
        }
        setPlayerNickname(result.nickname);
        window.localStorage.setItem("no-topo-player-nickname", result.nickname);
        setNicknameOpen(false);
        dismissOnboarding();
      }}>
        <input autoFocus maxLength={20} value={nicknameDraft} onChange={(event) => { setNicknameDraft(event.target.value); setNicknameError(""); }} placeholder={playerNickname} aria-label="Apelido" />
        {nicknameError && <span role="alert">{nicknameError}</span>}
        <div><button type="button" onClick={() => { setNicknameOpen(false); dismissOnboarding(); }}>Agora não</button><button type="submit">Usar apelido</button></div>
      </form>
    </div>}

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

    <div className="arena-ticker" aria-label="Informações da disputa">
      <span>{buildArenaTicker(arenaView)}</span>
    </div>

    <section className="bidbar glass">
      <div className="bid-caption"><span>Seu próximo lance</span><small>mínimo {formatCents(arenaView.nextBidCents)}</small></div>
      <div className="stepper"><button onClick={() => setOffer(Math.max(arenaView.nextBidCents, offer - arenaView.incrementCents))} aria-label="Diminuir"><Minus/></button><button className="offer-explain" onClick={() => setOutcomeOpen(true)} aria-label="Entender o que acontece com este lance">{formatCents(offer)}</button><button onClick={() => setOffer(offer + arenaView.incrementCents)} aria-label="Aumentar"><Plus/></button></div>
      <button className="lime-button" disabled={remaining !== "00:00:00"} onClick={openCheckout}>{remaining !== "00:00:00" ? `PROTEGIDO POR ${remaining}` : `ASSUMIR A TELA POR ${formatCents(arenaView.nextBidCents)}`} <ArrowUpRight/></button>
    </section>

    <BidCheckoutDialog open={open} onOpenChange={setOpen} amountCents={offer} onAmountChange={setOffer} minimumCents={arenaView.nextBidCents} nickname={playerNickname} defaultPostUrl={arenaView.featured.url} baseBidCents={arenaView.baseBidCents} incrementCents={arenaView.incrementCents} rules={arenaView.protectionRules} onApproved={() => { setOpen(false); void refreshArena(); }} />
    <BidOutcomeDialog open={outcomeOpen} onOpenChange={setOutcomeOpen} amountCents={offer} onAmountChange={setOffer} minimumCents={arenaView.nextBidCents} baseBidCents={arenaView.baseBidCents} incrementCents={arenaView.incrementCents} rules={arenaView.protectionRules} />
    <RulesDialog open={rulesOpen} onOpenChange={setRulesOpen} username={arenaView.featured.username} winningBidCents={arenaView.featured.bid} nextBidCents={arenaView.nextBidCents} incrementCents={arenaView.incrementCents} protectionActive={remaining !== "00:00:00"} />
  </main>;
}
