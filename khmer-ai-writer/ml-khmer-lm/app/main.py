import json
import torch
import sentencepiece as spm
from fastapi import FastAPI
from pydantic import BaseModel

from .model_def import GRULanguageModel
from .normalize import normalize_khmer

app = FastAPI(title="Khmer GRU LM API")

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

# Load config
with open("artifacts/config.json", "r", encoding="utf-8") as f:
    cfg = json.load(f)

# Load SentencePiece
sp = spm.SentencePieceProcessor()
sp.load("artifacts/sentencepiece.model")

# Load model
model = GRULanguageModel(
    vocab_size=cfg["vocab_size"],
    emb_dim=cfg["emb_dim"],
    hid_dim=cfg["hid_dim"],
    n_layers=cfg["n_layers"],
    dropout=cfg["dropout"],
    pad_id=cfg["pad_id"],
).to(DEVICE)

ckpt = torch.load("artifacts/best_gru.pt", map_location=DEVICE)
state = ckpt["model"] if isinstance(ckpt, dict) and "model" in ckpt else ckpt
if any(key.startswith("gru.") for key in state.keys()):
    state = {
        ("rnn." + key[4:]) if key.startswith("gru.") else key: value
        for key, value in state.items()
    }
model.load_state_dict(state, strict=False)
model.eval()

class SuggestIn(BaseModel):
    text: str
    topk: int = 5
    temperature: float = 1.0

class CompleteIn(BaseModel):
    text: str
    max_new_tokens: int = 60
    temperature: float = 0.9
    topk: int = 40

class ScoreIn(BaseModel):
    text: str

@app.get("/health")
def health():
    return {"ok": True}

@app.post("/api/lm/suggest")
def suggest(inp: SuggestIn):
    s = normalize_khmer(inp.text)
    ids = [sp.bos_id()] + sp.encode(s, out_type=int)
    x = torch.tensor(ids, dtype=torch.long, device=DEVICE).unsqueeze(0)

    with torch.no_grad():
        logits, _ = model(x)
        last = logits[0, -1] / max(inp.temperature, 1e-6)
        probs = torch.softmax(last, dim=-1)
        top = torch.topk(probs, k=inp.topk)

    out = []
    for tid, p in zip(top.indices.tolist(), top.values.tolist()):
        out.append({
            "id": tid,
            "piece": sp.id_to_piece(tid),
            "text": sp.decode([tid]),
            "p": float(p),
        })

    return {"input": s, "suggestions": out}

@app.post("/api/lm/complete")
def complete(inp: CompleteIn):
    s = normalize_khmer(inp.text)
    ids = [sp.bos_id()] + sp.encode(s, out_type=int)
    x = torch.tensor(ids, dtype=torch.long, device=DEVICE).unsqueeze(0)

    generated = []
    h = None

    with torch.no_grad():
        for _ in range(inp.max_new_tokens):
            logits, h = model(x)  # simple; you can optimize by only feeding last token later
            last = logits[0, -1] / max(inp.temperature, 1e-6)
            probs = torch.softmax(last, dim=-1)
            top = torch.topk(probs, k=inp.topk)
            # sample from top-k
            idx = torch.multinomial(top.values, num_samples=1).item()
            next_id = top.indices[idx].item()
            generated.append(next_id)

            x = torch.tensor([[next_id]], dtype=torch.long, device=DEVICE)

    text_out = sp.decode(generated)
    return {"prompt": s, "completion": text_out, "full_text": (s + text_out)}

@app.post("/api/lm/score")
def score(inp: ScoreIn):
    s = normalize_khmer(inp.text)
    ids = [sp.bos_id()] + sp.encode(s, out_type=int)
    x = torch.tensor(ids, dtype=torch.long, device=DEVICE).unsqueeze(0)

    with torch.no_grad():
        logits, _ = model(x[:, :-1])
        target = x[:, 1:]
        loss = torch.nn.functional.cross_entropy(
            logits.reshape(-1, logits.size(-1)),
            target.reshape(-1),
            reduction="mean"
        )
        ppl = torch.exp(loss).item()

    return {"text": s, "loss": float(loss.item()), "perplexity": float(ppl)}
