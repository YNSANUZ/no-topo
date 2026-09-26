"use client";

import { useState } from "react";
import { History, X } from "lucide-react";
import type { ArenaFeatured } from "@/lib/live-arena.mjs";
import { formatCents } from "@/lib/no-topo-api.mjs";

function timeLabel(entry: ArenaFeatured) {
  if (entry.founding) return entry.rank === 1 ? "Destaque inaugural" : "Destaque fundador";
  if (!entry.approvedAt) return "Conquista aprovada";
  const elapsed = Math.max(0, Date.now() - new Date(entry.approvedAt).getTime());
  const minutes = Math.floor(elapsed / 60000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.floor(hours / 24);
  return `há ${days} ${days === 1 ? "dia" : "dias"}`;
}

function ConquestList({ entries, limit }: { entries: ArenaFeatured[]; limit?: number }) {
  const visibleEntries = limit == null ? entries : entries.slice(0, limit);
  return <ol className="conquest-list">
    {visibleEntries.map((entry, index) => <li key={`${entry.username}-${entry.approvedAt || "inaugural"}-${index}`}>
      <span className="conquest-position">{index + 1}</span>
      <span className="conquest-person"><strong>{entry.username}</strong><small>{timeLabel(entry)}</small></span>
      <b>{formatCents(entry.bid)}</b>
    </li>)}
  </ol>;
}

export default function RecentConquests({ entries }: { entries: ArenaFeatured[] }) {
  const [open, setOpen] = useState(false);
  return <>
    <section className="conquests-card glass" aria-label="Últimas conquistas">
      <div className="conquests-title"><History size={14}/><span>ÚLTIMAS CONQUISTAS</span></div>
      <ConquestList entries={entries} limit={3}/>
    </section>
    <button className="conquests-mobile-trigger glass" type="button" onClick={() => setOpen(true)} aria-haspopup="dialog">
      <History size={15}/><span>Últimas conquistas</span><b>{entries.length}</b>
    </button>
    {open && <div className="conquests-sheet-backdrop" role="presentation" onClick={() => setOpen(false)}>
      <section className="conquests-sheet glass" role="dialog" aria-modal="true" aria-labelledby="conquests-title" onClick={(event) => event.stopPropagation()}>
        <header><div><small>HISTÓRICO PÚBLICO</small><strong id="conquests-title">Últimas conquistas</strong></div><button type="button" onClick={() => setOpen(false)} aria-label="Fechar"><X/></button></header>
        <div className="conquests-scroll"><ConquestList entries={entries}/></div>
        <p>Somente apelido, valor da conquista e momento são exibidos. Dados de pagamento permanecem privados.</p>
      </section>
    </div>}
  </>;
}
