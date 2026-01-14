import axios from 'axios';

const BASE_URL = process.env.ML_KHMER_LM_URL;

function getBaseUrl() {
  if (!BASE_URL) {
    throw new Error('ML_KHMER_LM_URL is not set');
  }
  return BASE_URL.replace(/\/$/, '');
}

export async function lmSuggest(text: string, topk = 5, temperature = 1.0) {
  const url = `${getBaseUrl()}/api/lm/suggest`;
  const { data } = await axios.post(
    url,
    { text, topk, temperature },
    { timeout: 15000, headers: { 'Content-Type': 'application/json' } }
  );
  return data;
}
