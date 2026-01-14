import json
import os
import re
import unicodedata
from typing import Dict, List, Optional, Tuple

import torch
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

MODEL_DIR = os.environ.get("NER_MODEL_DIR", "artifacts")
MODEL_PATH = os.path.join(MODEL_DIR, "model.pt")
CONFIG_PATH = os.path.join(MODEL_DIR, "config.json")
ID2LABEL_PATH = os.path.join(MODEL_DIR, "id2label.json")
VOCAB_PATH = os.path.join(MODEL_DIR, "vocab.json")

PAD = "<PAD>"
UNK = "<UNK>"
MAX_WORD_LEN = 24

app = FastAPI(title="Khmer NER API")


class NerIn(BaseModel):
    text: str


class EntityOut(BaseModel):
    text: str
    label: str
    score: float
    start: Optional[int] = None
    end: Optional[int] = None


class NerOut(BaseModel):
    text: str
    entities: List[EntityOut]


class CharEncoder(torch.nn.Module):
    def __init__(self, vocab_size: int, emb_dim: int, hid_dim: int, pad_idx: int):
        super().__init__()
        self.emb = torch.nn.Embedding(vocab_size, emb_dim, padding_idx=pad_idx)
        self.rnn = torch.nn.GRU(emb_dim, hid_dim, batch_first=True)

    def forward(self, x: torch.Tensor, lengths: torch.Tensor) -> torch.Tensor:
        emb = self.emb(x)
        packed = torch.nn.utils.rnn.pack_padded_sequence(
            emb, lengths.cpu(), batch_first=True, enforce_sorted=False
        )
        _, h = self.rnn(packed)
        return h.squeeze(0)


class NerModel(torch.nn.Module):
    def __init__(self, vocab_size: int, emb_dim: int, hid_dim: int, num_labels: int, pad_idx: int):
        super().__init__()
        self.char_encoder = CharEncoder(vocab_size, emb_dim, hid_dim, pad_idx)
        self.ctx_rnn = torch.nn.GRU(hid_dim, hid_dim, batch_first=True, bidirectional=True)
        self.bio_head = torch.nn.Linear(hid_dim * 2, num_labels)

    def forward(self, x: torch.Tensor, lengths: torch.Tensor, mask: torch.Tensor) -> torch.Tensor:
        bsz, seq_len, char_len = x.shape
        x_flat = x.view(bsz * seq_len, char_len)
        lengths_flat = lengths.view(bsz * seq_len)
        lengths_safe = torch.clamp(lengths_flat, min=1)

        with torch.no_grad():
            h = self.char_encoder(x_flat, lengths_safe)

        h_seq = h.view(bsz, seq_len, -1)
        out, _ = self.ctx_rnn(h_seq)
        bio_logits = self.bio_head(out)
        return bio_logits


model = None
id2label: Optional[Dict[str, str]] = None
char2idx: Optional[Dict[str, int]] = None
pad_idx = 0
unk_idx = 1


def normalize_text(s: str) -> str:
    return unicodedata.normalize("NFC", s).replace("\u200b", "").replace("\ufeff", "")


def ws_tokens_with_spans(text: str) -> Tuple[List[str], List[Tuple[int, int]]]:
    tokens = []
    spans = []
    for match in re.finditer(r"\S+", text):
        tokens.append(match.group(0))
        spans.append((match.start(), match.end()))
    return tokens, spans


def build_char_vocab(words: List[str]) -> Dict[str, int]:
    chars = set()
    for w in words:
        for ch in normalize_text(w):
            if ch.strip():
                chars.add(ch)
    idx2char = [PAD, UNK] + sorted(chars)
    return {c: i for i, c in enumerate(idx2char)}


def encode_word(word: str, vocab: Dict[str, int]) -> List[int]:
    word = normalize_text(word)
    ids = []
    for ch in word[:MAX_WORD_LEN]:
        ids.append(vocab.get(ch, vocab[UNK]))
    if len(ids) < MAX_WORD_LEN:
        ids += [vocab[PAD]] * (MAX_WORD_LEN - len(ids))
    return ids


def true_char_len(word: str) -> int:
    return min(len(normalize_text(word)), MAX_WORD_LEN)


def load_artifacts():
    global model, id2label, char2idx, pad_idx, unk_idx
    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        cfg = json.load(f)
    with open(ID2LABEL_PATH, "r", encoding="utf-8") as f:
        id2label = json.load(f)
    with open(VOCAB_PATH, "r", encoding="utf-8") as f:
        vocab_words = list(json.load(f).keys())

    char2idx = build_char_vocab(vocab_words)
    pad_idx = char2idx[PAD]
    unk_idx = char2idx[UNK]

    model = NerModel(
        vocab_size=len(char2idx),
        emb_dim=cfg["embedding_dim"],
        hid_dim=cfg["hidden_dim"],
        num_labels=cfg["num_labels"],
        pad_idx=pad_idx,
    )
    state = torch.load(MODEL_PATH, map_location="cpu", weights_only=True)
    model.load_state_dict(state, strict=True)
    model.eval()


@app.on_event("startup")
def startup():
    try:
        load_artifacts()
    except Exception:
        # Keep service alive to report errors clearly.
        pass


@app.get("/health")
def health():
    return {"ok": True, "model_loaded": model is not None}


def decode_entities(
    tokens: List[str],
    spans: List[Tuple[int, int]],
    labels: List[str],
    scores: List[float],
) -> List[EntityOut]:
    entities: List[EntityOut] = []
    current = None

    def flush():
        nonlocal current
        if current is None:
            return
        entities.append(
            EntityOut(
                text=current["text"],
                label=current["label"],
                score=sum(current["scores"]) / max(len(current["scores"]), 1),
                start=current["start"],
                end=current["end"],
            )
        )
        current = None

    for token, span, label, score in zip(tokens, spans, labels, scores):
        if label == "O":
            flush()
            continue

        prefix, tag = (label.split("-", 1) + [""])[:2] if "-" in label else ("B", label)
        if current is None or prefix == "B" or current["label"] != tag:
            flush()
            current = {
                "text": token,
                "label": tag,
                "scores": [score],
                "start": span[0],
                "end": span[1],
            }
        else:
            current["text"] = f"{current['text']} {token}"
            current["scores"].append(score)
            current["end"] = span[1]

    flush()
    return entities


@app.post("/api/ner", response_model=NerOut)
def ner(inp: NerIn):
    if not inp.text:
        raise HTTPException(status_code=400, detail="text is required")
    if model is None or id2label is None or char2idx is None:
        raise HTTPException(
            status_code=503,
            detail="NER model not loaded. Ensure artifacts are in the model directory.",
        )

    text = normalize_text(inp.text)
    tokens, spans = ws_tokens_with_spans(text)
    if not tokens:
        return NerOut(text=text, entities=[])

    x = torch.tensor([encode_word(w, char2idx) for w in tokens], dtype=torch.long).unsqueeze(0)
    lc = torch.tensor([[true_char_len(w) for w in tokens]], dtype=torch.long)
    mask = torch.ones((1, len(tokens)), dtype=torch.bool)

    with torch.no_grad():
        logits = model(x, lc, mask)
        probs = torch.softmax(logits, dim=-1)
        pred_ids = torch.argmax(probs, dim=-1)[0].tolist()
        pred_scores = probs.max(dim=-1).values[0].tolist()

    labels = [id2label.get(str(idx), "O") for idx in pred_ids]
    entities = decode_entities(tokens, spans, labels, pred_scores)

    return NerOut(text=text, entities=entities)
