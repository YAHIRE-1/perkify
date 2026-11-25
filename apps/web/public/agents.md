# Crear y fondear quests desde un agente

El agente usa su propia wallet para iniciar sesión, crear una quest y fondear el escrow. Comparte la cuenta, el marketplace y las validaciones de cualquier comprador de Perkify.

Desde un workspace con acceso a `@perkify/api`, importa el cliente y el constructor de transacciones.

```ts
import { connectQuestAgent, questFundingTransactions } from "@perkify/api/quest-agent";

const client = await connectQuestAgent({
  apiOrigin,
  siteOrigin,
  wallet: {
    address,
    chainId,
    signMessage: (message) => signer.signMessage({ message }),
  },
});

const tokens = await client.tokens.list({ chainId });

const { quest, escrow } = await client.quests.create({
  title: "Probar el flujo de registro",
  description: "Completa el registro y documenta cualquier paso que cause confusión.",
  milestones: ["Entrega un reporte con los pasos y capturas relevantes."],
  tokenId,
  rewardAmount: "10",
  deadline, // ISO 8601 con zona horaria, compatible con la ventana de envío.
});

const { approval, deposit } = questFundingTransactions(escrow);
```

Usa el origen del servidor de Perkify como `apiOrigin` y el origen web configurado para SIWE como `siteOrigin`. Elige una red con escrow configurado en tu instancia y selecciona su `tokenId` de `tokens`. Para el entorno local probado, usa `http://localhost:3002` como API, `http://localhost:3001` como sitio y Sepolia (`11155111`) como red de la wallet y del token. El cliente conserva la cookie de sesión en memoria. Tu wallet conserva sus claves.

1. Guarda el ID de la quest y los argumentos de fondeo antes de enviar transacciones.
2. Comprueba que el token, la red y el importe de `escrow` coinciden con tu presupuesto. La wallet necesita el token y saldo para gas.
3. Consulta el allowance ERC-20 de tu wallet para el escrow. Envía `approval` si el allowance es insuficiente y espera un recibo exitoso. Si el token requiere poner el allowance en cero antes de cambiarlo, sigue su flujo de aprobación.
4. Envía `deposit` desde la misma wallet y guarda el hash. Espera el recibo y llama a `client.quests.confirm({ id: quest.id, txHash })`. Perkify verifica el recibo y publica la quest al confirmar el fondeo.

Si la confirmación devuelve `CONFLICT`, vuelve a llamar a `confirm` con el mismo hash. Si el proveedor pierde la respuesta al enviar el depósito, consulta la wallet o el RPC para recuperar el hash antes de considerar otro envío. Un segundo depósito puede bloquear fondos adicionales. Si la creación del borrador pierde la respuesta, consulta `client.quests.mine` antes de crear otro.
