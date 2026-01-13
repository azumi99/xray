import axios from "axios";

export async function sendAwb(imageUri: string) {
  const formData = new FormData();

  formData.append("awb", {
    uri: imageUri,
    name: "awb.jpg",
    type: "image/jpeg",
  } as any);

  const response = await axios.post(
    "https://n8n-0mkotfm4evfi.n8x.biz.id/webhook/7b8a30c4-d69a-4015-b17a-285ddcf7f088",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      timeout: 20000,
    }
  );

  return response.data;
}
