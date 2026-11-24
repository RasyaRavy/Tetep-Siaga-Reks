import { z } from "zod";

export const BmkgLokasiSchema = z.object({
  adm1: z.string(),
  adm2: z.string(),
  adm3: z.string(),
  adm4: z.string(),
  provinsi: z.string(),
  kotkab: z.string(),
  kecamatan: z.string(),
  desa: z.string(),
  lon: z.number(),
  lat: z.number(),
  timezone: z.string().optional(),
});

export const BmkgForecastSlotSchema = z.object({
  datetime: z.string().optional(),
  utc_datetime: z.string(),
  local_datetime: z.string().optional(),
  analysis_date: z.string().optional(),
  t: z.number(),
  tcc: z.number().default(0),
  tp: z.number().default(0),
  weather: z.number(),
  weather_desc: z.string(),
  weather_desc_en: z.string().optional(),
  wd_deg: z.number().default(0),
  wd: z.string().default("-"),
  wd_to: z.string().optional(),
  ws: z.number().default(0),
  hu: z.number(),
  vs: z.number().nullable().optional(),
  vs_text: z.string().nullable().optional(),
  image: z.string().optional(),
});

export const BmkgForecastResponseSchema = z.object({
  lokasi: BmkgLokasiSchema,
  data: z
    .array(
      z.object({
        lokasi: BmkgLokasiSchema.optional(),
        cuaca: z.array(z.array(BmkgForecastSlotSchema)).min(1),
      }),
    )
    .min(1),
});

export type BmkgLokasi = z.infer<typeof BmkgLokasiSchema>;
export type BmkgForecastSlot = z.infer<typeof BmkgForecastSlotSchema>;
export type BmkgForecastResponse = z.infer<typeof BmkgForecastResponseSchema>;

export const BmkgRawGempaSchema = z.object({
  Tanggal: z.string(),
  Jam: z.string(),
  DateTime: z.string(),
  Coordinates: z.string(),
  Lintang: z.string().optional(),
  Bujur: z.string().optional(),
  Magnitude: z.string(),
  Kedalaman: z.string(),
  Wilayah: z.string(),
  Potensi: z.string().optional(),
  Dirasakan: z.string().optional(),
  Shakemap: z.string().optional(),
});

export const BmkgAutoGempaResponseSchema = z.object({
  Infogempa: z.object({
    gempa: BmkgRawGempaSchema,
  }),
});

export const BmkgGempaListResponseSchema = z.object({
  Infogempa: z.object({
    gempa: z.array(BmkgRawGempaSchema),
  }),
});

export type BmkgRawGempa = z.infer<typeof BmkgRawGempaSchema>;
