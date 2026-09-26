const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const clock = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "America/Sao_Paulo",
});
const formatMoney = (cents) => money.format(cents / 100).replaceAll("\u00a0", " ");

export function buildArenaTicker(view, now = new Date()) {
  if (Array.isArray(view.podium) && view.podium.length === 0 && view.featured.bid > 0) {
    return `● ${view.featured.username} conquistou o topo com ${formatMoney(view.featured.bid)} • a proteção terminou • agora ${formatMoney(view.nextBidCents)} assume a tela e garante 10 minutos protegidos`;
  }
  const protectedUntil = view.protectedUntil ? new Date(view.protectedUntil) : null;
  const protection = protectedUntil && protectedUntil.getTime() > now.getTime()
    ? `protegido até ${clock.format(protectedUntil)}`
    : "proteção encerrada";
  return protectedUntil && protectedUntil.getTime() > now.getTime()
    ? `● ${view.featured.username} conquistou o topo com ${formatMoney(view.featured.bid)} • ${protection} • depois, o próximo lance começa em ${formatMoney(view.nextBidCents)}`
    : `● ${view.featured.username} conquistou o topo com ${formatMoney(view.featured.bid)} • a proteção terminou • agora ${formatMoney(view.nextBidCents)} assume a tela • o mínimo cai ${formatMoney(view.incrementCents || 2000)} por hora`;
}
