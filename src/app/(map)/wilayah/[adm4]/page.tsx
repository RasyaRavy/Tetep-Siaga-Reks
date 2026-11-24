import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getRegionByAdm4, slugToAdm4 } from "@/lib/regions";

export const revalidate = 1800;

interface WilayahPageProps {
  params: Promise<{ adm4: string }>;
}

export async function generateMetadata({
  params,
}: WilayahPageProps): Promise<Metadata> {
  const { adm4: slug } = await params;
  const region = getRegionByAdm4(slugToAdm4(slug));
  if (!region) {
    return { title: "Wilayah Tidak Ditemukan | Tetep Siaga Reks" };
  }
  return {
    title: `Cuaca ${region.desa}, Kec. ${region.kecamatan} | Tetep Siaga Reks`,
    description: `Prakiraan cuaca resmi BMKG untuk ${region.desa}, Kecamatan ${region.kecamatan}, ${region.kotkab}.`,
  };
}

export default async function WilayahPage({ params }: WilayahPageProps) {
  const { adm4: slug } = await params;
  const region = getRegionByAdm4(slugToAdm4(slug));
  if (!region) {
    notFound();
  }
  return null;
}
