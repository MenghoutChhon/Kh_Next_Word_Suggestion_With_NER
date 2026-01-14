# Khmer NER Service

This service mirrors `ml-khmer-lm` but serves your Khmer NER BiLSTM/GRU model via FastAPI.

Expected artifacts in `artifacts/`
- `model.pt` (state dict)
- `config.json` (embedding_dim, hidden_dim, num_labels)
- `id2label.json` (id to label mapping)
- `label2id.json` and `vocab.json` are kept for reference

Endpoints
- `GET /health` returns `{ ok, model_loaded }`
- `POST /api/ner` with `{ "text": "..." }` returns `{ text, entities: [...] }`
