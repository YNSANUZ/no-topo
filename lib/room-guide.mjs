const replies = Object.freeze({
  greeting: ["Oi! Bem-vindo à arena 👋", "Olá! Fique à vontade para explorar."],
  ranking: ["Para assumir a tela, o lance precisa cobrir o valor mínimo mostrado abaixo."],
  generic: ["Legal! A sala inteira acompanha o destaque ao vivo.", "Boa! Você também pode clicar nas poltronas para sentar."],
});

export function roomGuideReply(message, random = Math.random) {
  const text = String(message || "").toLocaleLowerCase("pt-BR");
  const group = /\b(oi|olá|ola|bom dia|boa tarde|boa noite)\b/.test(text)
    ? replies.greeting
    : /\b(primeiro|topo|lance|pagar|valor|ranking)\b/.test(text)
      ? replies.ranking
      : replies.generic;
  return group[Math.min(group.length - 1, Math.floor(random() * group.length))];
}
