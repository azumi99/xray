import client from "@/graphql/client";
import { gql } from "@apollo/client";
import * as FileSystem from 'expo-file-system/legacy';

const REQUEST_OCR = gql`
  mutation RequestOcr($imageBase64: String!) {
    requestOcr(imageBase64: $imageBase64) { jobId status }
  }
`;

const OCR_RESULT = gql`
  query OcrResult($jobId: String!) {
    ocrResult(jobId: $jobId) { jobId status error result }
  }
`;

export type OcrDetail = {
  kurir?: string | null;
  tracking_number?: string | null;
  tanggal?: string | null;
  pengirim?: string | null;
  penerima_nama?: string | null;
  penerima_alamat?: string | null;
  penerima_kota?: string | null;
  penerima_kode_pos?: string | null;
  penerima_telepon?: string | null;
  berat?: string | null;
  jumlah_koli?: string | null;
  isi_barang?: string | null;
  nilai_deklarasi?: string | null;
  tipe_pajak?: string | null;
  cod?: boolean | null;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function sendAwb(imageUri: string): Promise<{ success: boolean; data: OcrDetail }> {
  const base64 = await FileSystem.readAsStringAsync(imageUri, { encoding: FileSystem.EncodingType.Base64 });
  const { data } = await client.mutate({ mutation: REQUEST_OCR, variables: { imageBase64: base64 } });
  const jobId = data?.requestOcr?.jobId;
  if (!jobId) throw new Error('OCR job was not created');

  for (let attempt = 0; attempt < 120; attempt += 1) {
    await sleep(1500);
    const result = await client.query({ query: OCR_RESULT, variables: { jobId }, fetchPolicy: 'no-cache' });
    const job = result.data?.ocrResult;
    if (job?.status === 'completed') return { success: true, data: (job.result ?? {}) as OcrDetail };
    if (job?.status === 'failed') throw new Error(job.error || 'OCR processing failed');
  }
  throw new Error('OCR processing timed out');
}
