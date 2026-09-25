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
    return `● Último destaque: ${view.featured.username} • qualquer lance a partir de ${formatMoney(view.nextBidCents)} toma a tela • disputa contínua, sem reset diário`;
  }
  const protectedUntil = view.protectedUntil ? new Date(view.protectedUntil) : null;
  const protection = protectedUntil && protectedUntil.getTime() > now.getTime()
    ? `protegido até ${clock.format(protectedUntil)}`
    : "proteção encerrada";
  return `● ${view.featured.username} lidera com ${formatMoney(view.featured.bid)} • ${protection} • próximo lance mínimo ${formatMoney(view.nextBidCents)} • o valor cai ${formatMoney(view.incrementCents || 2000)} por hora após a proteção`;
}
