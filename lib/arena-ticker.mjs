const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const clock = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "America/Sao_Paulo",
});
const formatMoney = (cents) => money.format(cents / 100).replaceAll("\u00a0", " ");

export function buildArenaTicker(view, now = new Date()) {
  const protectedUntil = view.protectedUntil ? new Date(view.protectedUntil) : null;
  const protection = protectedUntil && protectedUntil.getTime() > now.getTime()
    ? `protegido até ${clock.format(protectedUntil)}`
    : "proteção encerrada";
  const reset = view.cycleEndsAt ? clock.format(new Date(view.cycleEndsAt)) : "00:00";

  return `● ${view.featured.username} lidera com ${formatMoney(view.featured.bid)} • ${protection} • próximo lance mínimo ${formatMoney(view.nextBidCents)} • reset geral às ${reset}`;
}
