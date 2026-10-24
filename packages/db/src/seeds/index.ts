import "varlock/auto-load";
import { seedTokens } from "./tokens";

export async function runSeed() {
  try {
    console.log("🌱 Iniciando seeds de base de datos...");

    await seedTokens();

    console.log("✅ Seeds de base de datos completados exitosamente.");
  } catch (error) {
    console.error(
      "❌ Falló la ejecución de los seeds de base de datos:",
      error
    );

    process.exit(1);
  }
}

runSeed();
