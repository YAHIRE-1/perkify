import { z } from "zod";

const providerResult = z.object({
  data: z.object({ translations: z.array(z.object({ translatedText: z.string() })) }),
});

export async function translateText(text: string[], target: string, apiKey: string) {
  const response = await fetch("https://translation.googleapis.com/language/translate/v2", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": apiKey },
    body: JSON.stringify({ q: text, target, format: "text" }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error("Translation provider rejected the request");
  const result = providerResult.parse(await response.json());
  if (result.data.translations.length !== text.length) throw new Error("Incomplete translation");
  return result.data.translations.map(({ translatedText }) => translatedText);
}
