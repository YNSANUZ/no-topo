"use client";

import { useEffect, useRef, useState } from "react";
import { processBidPayment } from "@/lib/no-topo-api.mjs";

const PUBLIC_KEY = "APP_USR-68053913-290d-4ec4-9333-62b33a49f099";

type BrickController = { unmount: () => void };
type BrickBuilder = { create: (type: string, target: string, settings: Record<string, unknown>) => Promise<BrickController> };
type MercadoPagoInstance = { bricks: () => BrickBuilder };
type MercadoPagoConstructor = new (key: string, options?: { locale?: string }) => MercadoPagoInstance;

declare global { interface Window { MercadoPago?: MercadoPagoConstructor } }

let sdkPromise: Promise<void> | null = null;
function loadSdk() {
  if (window.MercadoPago) return Promise.resolve();
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://sdk.mercadopago.com/js/v2"; script.async = true;
    script.onload = () => resolve(); script.onerror = () => reject(new Error("Não foi possível carregar o pagamento."));
    document.head.appendChild(script);
  });
  return sdkPromise;
}

export default function MercadoPagoBrick({ reservationId, amountCents, onStatus }: { reservationId: string; amountCents: number; onStatus: (status: string) => void }) {
  const controller = useRef<BrickController | null>(null);
  const [error, setError] = useState("");
  const targetId = `payment-brick-${reservationId}`;

  useEffect(() => {
    let active = true;
    loadSdk().then(async () => {
      if (!active || !window.MercadoPago) return;
      const mp = new window.MercadoPago(PUBLIC_KEY, { locale: "pt-BR" });
      controller.current = await mp.bricks().create("payment", targetId, {
        initialization: { amount: amountCents / 100 },
        customization: { paymentMethods: { creditCard: "all", debitCard: "all", bankTransfer: "all", ticket: "all" } },
        callbacks: {
          onReady: () => setError(""),
          onError: () => setError("O formulário de pagamento não carregou. Tente novamente."),
          onSubmit: async ({ formData }: { formData: Record<string, unknown> }) => {
            const result = await processBidPayment(fetch, undefined, reservationId, formData);
            onStatus(String(result.status || "pending"));
            return result;
          },
        },
      });
    }).catch((reason: Error) => setError(reason.message));
    return () => { active = false; controller.current?.unmount(); controller.current = null; };
  }, [amountCents, onStatus, reservationId, targetId]);

  return <div className="payment-shell">{error && <p role="alert">{error}</p>}<div id={targetId} /></div>;
}
