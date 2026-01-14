import axios from 'axios';

const BASE_URL = process.env.ML_KHMER_NER_URL;

function getBaseUrl() {
  if (!BASE_URL) {
    throw new Error('ML_KHMER_NER_URL is not set');
  }
  return BASE_URL.replace(/\/$/, '');
}

export async function nerExtract(text: string) {
  const url = `${getBaseUrl()}/api/ner`;
  const { data } = await axios.post(
    url,
    { text },
    { timeout: 20000, headers: { 'Content-Type': 'application/json' } }
  );
  return data;
}
