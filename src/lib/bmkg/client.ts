export const BMKG_USER_AGENT =
  "TetepSiagaReks/1.0 (+https://github.com/tetep-siaga-reks; data=BMKG)";

const DEFAULT_TIMEOUT_MS = 8000;
const RETRY_DELAY_MS = 450;

export class BmkgFetchError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "BmkgFetchError";
    this.status = status;
  }
}

export interface BmkgFetchOptions {
  timeoutMs?: number;
  revalidateSeconds?: number;
  retries?: number;
  noStore?: boolean;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getBmkgApiBaseUrl(): string {
  return (
    process.env.BMKG_API_BASE_URL?.replace(/\/+$/, "") ||
    "https://api.bmkg.go.id"
  );
}

export function getBmkgDataBaseUrl(): string {
  return (
    process.env.BMKG_DATA_BASE_URL?.replace(/\/+$/, "") ||
    "https://data.bmkg.go.id"
  );
}

export function getBmkgWebBaseUrl(): string {
  return (
    process.env.BMKG_WEB_BASE_URL?.replace(/\/+$/, "") ||
    "https://www.bmkg.go.id"
  );
}

/**
 * Fetch JSON dari endpoint resmi BMKG dengan User-Agent eksplisit (non-browser),
 * batas waktu 8 detik, dan retry 1x untuk kegagalan jaringan/5xx sementara.
 */
export async function fetchBmkgJson<T = unknown>(
  url: string,
  options: BmkgFetchOptions = {},
): Promise<T> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const retries = options.retries ?? 1;
  const revalidate = options.revalidateSeconds ?? 1800;

  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": BMKG_USER_AGENT,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(timeoutMs),
        ...(options.noStore
          ? { cache: "no-store" as const }
          : { next: { revalidate } }),
      });

      if (!res.ok) {
        const shouldRetry =
          attempt < retries && (res.status === 429 || res.status >= 500);
        if (shouldRetry) {
          await sleep(RETRY_DELAY_MS);
          continue;
        }
        throw new BmkgFetchError(
          `BMKG merespons dengan status HTTP ${res.status}`,
          res.status,
        );
      }

      const contentType = res.headers.get("content-type") ?? "";
      if (contentType.includes("text/html")) {
        throw new BmkgFetchError(
          "BMKG mengembalikan halaman HTML, bukan JSON yang diharapkan",
          502,
        );
      }

      return (await res.json()) as T;
    } catch (err) {
      lastError = err;
      if (
        err instanceof BmkgFetchError &&
        err.status &&
        err.status >= 400 &&
        err.status < 500 &&
        err.status !== 429
      ) {
        throw err;
      }
      if (attempt < retries) {
        await sleep(RETRY_DELAY_MS);
      }
    }
  }

  if (lastError instanceof BmkgFetchError) {
    throw lastError;
  }
  const msg =
    lastError instanceof Error
      ? lastError.message
      : "Gagal menghubungi server BMKG";
  throw new BmkgFetchError(msg);
}

/**
 * Fetch teks XML/RSS dari endpoint resmi BMKG (mis. nowcast RSS & CAP 1.2 XML)
 * dengan User-Agent eksplisit (non-browser), batas waktu 8 detik, dan retry 1x.
 */
export async function fetchBmkgText(
  url: string,
  options: BmkgFetchOptions = {},
): Promise<string> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const retries = options.retries ?? 1;
  const revalidate = options.revalidateSeconds ?? 300;

  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": BMKG_USER_AGENT,
          Accept: "application/xml, application/rss+xml, text/xml, */*",
        },
        signal: AbortSignal.timeout(timeoutMs),
        ...(options.noStore
          ? { cache: "no-store" as const }
          : { next: { revalidate } }),
      });

      if (!res.ok) {
        const shouldRetry =
          attempt < retries && (res.status === 429 || res.status >= 500);
        if (shouldRetry) {
          await sleep(RETRY_DELAY_MS);
          continue;
        }
        throw new BmkgFetchError(
          `BMKG merespons dengan status HTTP ${res.status}`,
          res.status,
        );
      }

      return await res.text();
    } catch (err) {
      lastError = err;
      if (
        err instanceof BmkgFetchError &&
        err.status &&
        err.status >= 400 &&
        err.status < 500 &&
        err.status !== 429
      ) {
        throw err;
      }
      if (attempt < retries) {
        await sleep(RETRY_DELAY_MS);
      }
    }
  }

  if (lastError instanceof BmkgFetchError) {
    throw lastError;
  }
  const msg =
    lastError instanceof Error
      ? lastError.message
      : "Gagal menghubungi server peringatan dini BMKG";
  throw new BmkgFetchError(msg);
}
