import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const web = fileURLToPath(new URL('../apps/web/', import.meta.url));
const catalogPath = join(web, 'lib/i18n/messages.json');
const locales = JSON.parse(await readFile(join(web, 'lib/i18n/locales.json'), 'utf8'));
const catalog = JSON.parse(await readFile(catalogPath, 'utf8'));
const check = process.argv.includes('--check');
const sources = new Set(Object.values(catalog).flatMap(Object.keys));

async function collect(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await collect(path);
    else if (/\.tsx?$/.test(entry.name)) {
      const source = await readFile(path, 'utf8');
      for (const match of source.matchAll(/(?:<Translate text=\{|\bt\()\s*("(?:\\.|[^"\\])*")/g)) {
        sources.add(JSON.parse(match[1]));
      }
    }
  }
}

for (const directory of ['app', 'components', 'lib']) await collect(join(web, directory));

const key = process.env.GOOGLE_TRANSLATE_API_KEY;
const placeholders = (message) => (message.match(/\{\w+\}/g) ?? []).sort().join(' ');
let missing = 0;
let invalid = 0;

for (const [locale, { translationTarget }] of Object.entries(locales)) {
  if (!translationTarget) continue;
  const dictionary = catalog[locale] ??= {};
  for (const [source, value] of Object.entries(dictionary)) {
    if (typeof value === 'string' && value.trim() && placeholders(value) === placeholders(source)) continue;
    console.error(`Invalid translation for ${locale}: ${source}`);
    invalid++;
  }
  const pending = [...sources].filter((source) => !Object.hasOwn(dictionary, source));
  missing += pending.length;
  if (!pending.length) continue;

  if (check || !key) {
    console.log(`${locale}: ${pending.length} missing messages\n${pending.join('\n')}`);
    continue;
  }

  for (let offset = 0; offset < pending.length; offset += 50) {
    const batch = pending.slice(offset, offset + 50);
    const response = await fetch('https://translation.googleapis.com/language/translate/v2', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key },
      body: JSON.stringify({ source: 'en', target: translationTarget, format: 'text', q: batch }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) throw new Error(`Cloud Translation returned HTTP ${response.status} for ${locale}`);

    const { data } = await response.json();
    if (data?.translations?.length !== batch.length) throw new Error(`Unexpected response for ${locale}`);
    for (const [index, source] of batch.entries()) {
      const value = data.translations[index]?.translatedText;
      if (typeof value !== 'string' || !value.trim() || placeholders(value) !== placeholders(source)) {
        throw new Error(`Invalid translation for ${locale}: ${source}`);
      }
      dictionary[source] = value;
    }
    console.log(`Translated ${batch.length} messages for ${locale}`);
  }
}

if (invalid) {
  process.exitCode = 1;
} else if (missing && !check && key) {
  await writeFile(catalogPath, JSON.stringify(catalog, null, 2) + '\n', 'utf8');
} else if (missing) {
  process.exitCode = 1;
} else {
  console.log('Translation catalogs are complete for registered messages.');
}
