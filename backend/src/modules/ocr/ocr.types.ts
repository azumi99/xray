import { Field, ObjectType } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-scalars';

export const OCR_PROMPT = `Anda adalah ahli membaca label dan dokumen pengiriman kargo (airway bill / courier label).
Ekstrak informasi dari gambar dan kembalikan HANYA sebuah JSON objek dengan struktur persis berikut:

{
  "kurir": <nama kurir/ekspedisi, contoh "QEP Express (WPX)", "IDE EXP">,
  "tracking_number": <nomor tracking utama>,
  "tanggal": <tanggal pengiriman, format "YYYY-MM-DD" bila mungkin>,
  "pengirim": <nama dan perusahaan pengirim dalam satu baris>,
  "penerima_nama": <nama penerima>,
  "penerima_alamat": <alamat lengkap penerima>,
  "penerima_kota": <kota penerima>,
  "penerima_kode_pos": <kode pos penerima>,
  "penerima_telepon": <telepon penerima>,
  "berat": <berat paket beserta satuannya, contoh "1.95 kg">,
  "jumlah_koli": <jumlah koli, contoh "1/1">,
  "isi_barang": <deskripsi isi barang, gabungkan beberapa item dengan koma>,
  "nilai_deklarasi": <nilai deklarasi beserta mata uang, contoh "2.4 USD">,
  "tipe_pajak": <"DDP"|"DDU"|"DAP"|...>,
  "cod": <boolean, true jika ada tanda COD (Cash On Delivery)>
}

Aturan:
- Gunakan "" (string kosong) untuk data yang tidak terbaca atau tidak ada; "cod" tetap boolean.
- Hati-hati membedakan huruf O dan angka 0, huruf I dan angka 1 pada nomor.
- Balas HANYA JSON, tanpa markdown dan tanpa penjelasan.`;

export type OcrExtraction = {
  tracking_number?: string | null;
  [key: string]: unknown;
};

export type OcrResult = {
  result: OcrExtraction;
  awb_number: string | null;
};

@ObjectType()
export class OcrJobResult {
  @Field() jobId!: string;
  @Field() status!: 'waiting' | 'active' | 'completed' | 'failed';
  @Field(() => String, { nullable: true }) awb_number!: string | null;
  @Field(() => String, { nullable: true }) error!: string | null;
  @Field(() => GraphQLJSON, { nullable: true })
  result?: OcrExtraction | null;
}

export function buildOllamaBody(imageBase64: string) {
  return {
    model: process.env.OLLAMA_MODEL ?? 'qwen3-vl:65k',
    prompt: OCR_PROMPT,
    images: [imageBase64],
    stream: false,
    format: 'json',
    think: false,
    options: {
      temperature: 0,
      num_ctx: 81920,
      num_predict: 2048,
      repeat_penalty: 1.1,
    },
  };
}

export function parseOllamaResponse(json: unknown): OcrResult {
  const response = json as { response?: string; thinking?: string };
  // Server ini memindahkan output JSON ke field `thinking` saat think:false
  const raw = response.response?.trim() || response.thinking?.trim() || '{}';
  let result: OcrExtraction = {};
  try {
    result = JSON.parse(raw) ?? {};
  } catch (error) {
    throw new Error(`Gagal parse hasil OCR: ${(error as Error).message}`);
  }
  const tracking = typeof result.tracking_number === 'string' ? result.tracking_number.trim() : null;
  return { result, awb_number: tracking || null };
}
