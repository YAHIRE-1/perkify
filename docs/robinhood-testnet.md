# Probar QuestEscrow en Robinhood Chain Testnet

Robinhood Chain Testnet usa el ID `46630` y cobra gas en ETH de prueba. Perkify usa el RPC público por defecto. Configura `ROBINHOOD_TESTNET_RPC_URL` si necesitas otro proveedor para el servidor y Foundry. [Configuración oficial de la red](https://docs.robinhood.com/chain/add-network-to-wallet/)

1. Configura `DEPLOYER_PRIVATE_KEY`, `ARBITER_ADDRESS` y `VOUCHER_SIGNER_ADDRESS` en el entorno de prueba. Usa una cuenta de despliegue financiada con ETH de prueba.
2. Ejecuta `pnpm run contracts:simulate:robinhood-testnet`. Foundry simula el despliegue con el contrato actual y valida que el RPC reporte la red `46630`.
3. Cuando quieras enviar la transacción, ejecuta `pnpm run contracts:deploy:robinhood-testnet`.
4. Copia la dirección que imprimió Foundry a `QUEST_ESCROW_ROBINHOOD_TESTNET` en el entorno del servidor y de la web. Configura en el servidor las claves de prueba que correspondan al firmante y al árbitro del despliegue. Reinicia el servidor y vuelve a compilar la web.
5. Cambia tu wallet a Robinhood Chain Testnet antes de crear la quest. El catálogo de tu entorno de prueba debe tener un ERC-20 aceptado con `chainId = 46630`. Selecciona ese token al crear la quest.
