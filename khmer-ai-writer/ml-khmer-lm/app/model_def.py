import torch
import torch.nn as nn

class GRULanguageModel(nn.Module):
    def __init__(self, vocab_size: int, emb_dim: int, hid_dim: int, n_layers: int, dropout: float, pad_id: int):
        super().__init__()
        self.emb = nn.Embedding(vocab_size, emb_dim, padding_idx=pad_id)
        self.rnn = nn.GRU(emb_dim, hid_dim, num_layers=n_layers, batch_first=True, dropout=dropout if n_layers > 1 else 0.0)
        self.fc = nn.Linear(hid_dim, vocab_size)

    def forward(self, x):
        e = self.emb(x)
        out, h = self.rnn(e)
        logits = self.fc(out)
        return logits, h
