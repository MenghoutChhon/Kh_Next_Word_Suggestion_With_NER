export interface MLModelConfig {
  name: string;
  displayName: string;
  endpoint: string;
  timeoutMs?: number;
}

// Parse JSON registry from env or fall back to a simple placeholder list.
// Example env:
// ML_MODEL_REGISTRY='[{"name":"tf-malware","displayName":"TensorFlow Malware","endpoint":"http://ml-service:8000"},{"name":"torch-malware","displayName":"PyTorch Malware","endpoint":"http://ml-torch:8000"}]'
const registryEnv = process.env.ML_MODEL_REGISTRY;

export const modelRegistry: MLModelConfig[] = registryEnv
  ? (() => {
      try {
        return JSON.parse(registryEnv);
      } catch (err) {
        console.warn('Failed to parse ML_MODEL_REGISTRY, using empty registry');
        return [];
      }
    })()
  : [];

export function getModelConfig(name: string): MLModelConfig | undefined {
  return modelRegistry.find((m) => m.name === name);
}

export default modelRegistry;
