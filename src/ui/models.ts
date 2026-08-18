import {
  DEFAULT_MODEL,
  TEXT_MODEL_TYPES,
  TOGETHER_MODELS_URL,
  togetherApiKey,
} from "./config.js";

export type CatalogModel = {
  id: string;
  type: string;
  displayName: string;
  organization: string;
};

type TogetherModel = {
  id?: unknown;
  type?: unknown;
  display_name?: unknown;
  organization?: unknown;
};

type Cache = { at: number; models: CatalogModel[] };

const TTL_MS = 10 * 60 * 1000;
let cache: Cache | null = null;

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function normalize(raw: TogetherModel): CatalogModel | null {
  const id = asString(raw.id).trim();
  const type = asString(raw.type).trim();
  if (!id || !TEXT_MODEL_TYPES.includes(type as (typeof TEXT_MODEL_TYPES)[number])) {
    return null;
  }
  return {
    id,
    type,
    displayName: asString(raw.display_name).trim() || id,
    organization: asString(raw.organization).trim() || "Together",
  };
}

async function fetchCatalog(): Promise<CatalogModel[]> {
  const upstream = await fetch(TOGETHER_MODELS_URL, {
    headers: { Authorization: `Bearer ${togetherApiKey()}` },
    signal: AbortSignal.timeout(15_000),
  });
  if (!upstream.ok) {
    throw new Error(`Together models list failed (${upstream.status}).`);
  }
  const data: unknown = await upstream.json();
  const rows = Array.isArray(data)
    ? data
    : data && typeof data === "object" && "data" in data && Array.isArray(data.data)
      ? data.data
      : [];
  const models = rows
    .map((row) =>
      row && typeof row === "object" ? normalize(row as TogetherModel) : null,
    )
    .filter((row): row is CatalogModel => row !== null)
    .sort((a, b) => a.id.localeCompare(b.id));
  if (!models.some((model) => model.id === DEFAULT_MODEL)) {
    models.unshift({
      id: DEFAULT_MODEL,
      type: "chat",
      displayName: DEFAULT_MODEL,
      organization: "Default",
    });
  }
  return models;
}

export async function listTextModels(): Promise<CatalogModel[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.models;
  try {
    cache = { at: Date.now(), models: await fetchCatalog() };
    return cache.models;
  } catch (error) {
    console.error("Could not list Together models", error);
    if (cache) return cache.models;
    return [
      {
        id: DEFAULT_MODEL,
        type: "chat",
        displayName: DEFAULT_MODEL,
        organization: "Default",
      },
    ];
  }
}

export async function isKnownTextModel(id: string): Promise<boolean> {
  const models = await listTextModels();
  return models.some((model) => model.id === id);
}
