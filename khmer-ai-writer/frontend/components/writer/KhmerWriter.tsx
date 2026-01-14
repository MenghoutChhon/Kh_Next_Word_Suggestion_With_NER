import React, { useEffect, useMemo, useState } from 'react';
import { Sparkles, PenLine, Gauge, Tags } from 'lucide-react';
import { apiClient } from '@/lib/api';

interface KhmerWriterProps {
  userTier?: string;
}

export function KhmerWriter({ userTier = 'free' }: KhmerWriterProps) {
  const [text, setText] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loadingSuggest, setLoadingSuggest] = useState(false);
  const [loadingNer, setLoadingNer] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nerEntities, setNerEntities] = useState<any[]>([]);
  const [autoSuggest, setAutoSuggest] = useState(false);

  const [suggestTopK, setSuggestTopK] = useState(5);
  const [suggestTemp, setSuggestTemp] = useState(1.0);

  const debouncedText = useMemo(() => text.trim(), [text]);

  useEffect(() => {
    if (!autoSuggest) return;
    if (!debouncedText) {
      setSuggestions([]);
      return;
    }
    const handle = setTimeout(() => {
      void handleSuggest(debouncedText);
    }, 350);
    return () => clearTimeout(handle);
  }, [autoSuggest, debouncedText, suggestTopK, suggestTemp]);

  const handleSuggest = async (value?: string) => {
    const payload = (value ?? text).trim();
    if (!payload) {
      setSuggestions([]);
      return;
    }
    setError(null);
    setLoadingSuggest(true);
    try {
      const res = await apiClient.lmSuggest(payload, suggestTopK, suggestTemp);
      setSuggestions(res.data?.suggestions ?? []);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to get suggestions');
    } finally {
      setLoadingSuggest(false);
    }
  };

  const insertSuggestion = (value: string) => {
    setText((prev) => prev + value);
  };

  const handleNer = async () => {
    if (!text.trim()) return;
    setLoadingNer(true);
    setError(null);
    try {
      const res = await apiClient.nerExtract(text);
      setNerEntities(res.data?.entities ?? res.data?.results ?? []);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to extract entities');
    } finally {
      setLoadingNer(false);
    }
  };

  return (
    <div className="space-y-8 relative">
      <div className="glass-card p-8 rounded-3xl text-center">
        <div className="flex justify-center mb-6">
          <div className="p-6 gradient-bg-lavender rounded-3xl shadow-2xl">
            <PenLine className="h-12 w-12 text-foreground" />
          </div>
        </div>
        <h1 className="ios-title text-foreground mb-3 font-bold">Khmer AI Writer</h1>
        <p className="ios-body text-muted-foreground mb-6 max-w-2xl mx-auto font-medium">
          Autocomplete Khmer writing with your GRU language model and extract Khmer entities.
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <div className="dynamic-island">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-foreground text-sm font-semibold">Live Suggestions</span>
            </div>
          </div>
          <div className="dynamic-island">
            <div className="flex items-center gap-2">
              <Tags className="h-4 w-4 text-primary" />
              <span className="text-foreground text-sm font-semibold">Khmer NER</span>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="glass-card p-6 rounded-3xl bg-error/15 border-error/30">
          <div className="flex items-center gap-4">
            <Gauge className="h-6 w-6 text-error" />
            <p className="text-foreground font-semibold flex-1">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-muted-foreground hover:text-foreground transition-colors p-2 rounded-xl hover:bg-card water-ripple font-bold text-xl"
            >
              x
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="glass-card p-8 rounded-3xl space-y-6">
          <div>
            <h3 className="ios-headline text-foreground font-bold mb-3">Compose</h3>
            <textarea
              id="khmer-writer-compose"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={7}
              className="w-full rounded-2xl bg-input-background border border-border p-4 text-foreground focus:outline-none focus:border-primary"
              placeholder="Start typing Khmer..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="khmer-writer-suggest-topk" className="ios-caption text-muted-foreground">Suggest Top-K</label>
              <input
                id="khmer-writer-suggest-topk"
                type="number"
                min={1}
                max={50}
                value={suggestTopK}
                onChange={(e) => setSuggestTopK(Number(e.target.value))}
                className="mt-2 w-full rounded-xl bg-input-background border border-border p-3 text-foreground"
              />
            </div>
            <div>
              <label htmlFor="khmer-writer-suggest-temp" className="ios-caption text-muted-foreground">Suggest Temp</label>
              <input
                id="khmer-writer-suggest-temp"
                type="number"
                min={0.1}
                step={0.1}
                value={suggestTemp}
                onChange={(e) => setSuggestTemp(Number(e.target.value))}
                className="mt-2 w-full rounded-xl bg-input-background border border-border p-3 text-foreground"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              onClick={() => handleSuggest()}
              disabled={loadingSuggest || !text.trim()}
              className="ios-button disabled:opacity-50"
            >
              {loadingSuggest ? 'Generating...' : 'Generate Suggestions'}
            </button>
            <button
              onClick={() => setAutoSuggest((prev) => !prev)}
              className={`px-4 py-2 rounded-full border transition-all ${
                autoSuggest
                  ? 'bg-primary/15 border-primary/40 text-foreground'
                  : 'bg-card border-border text-foreground'
              }`}
            >
              {autoSuggest ? 'Auto: On' : 'Auto: Off'}
            </button>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="ios-caption text-muted-foreground">Suggestions</span>
              {loadingSuggest && <span className="ios-caption text-muted-foreground">Loading...</span>}
            </div>
            <div className="flex flex-wrap gap-2">
              {suggestions.length === 0 && !loadingSuggest ? (
                <span className="ios-caption text-muted-foreground">No suggestions yet.</span>
              ) : null}
              {suggestions.map((s, idx) => (
                <button
                  key={`${s.id}-${idx}`}
                  onClick={() => insertSuggestion(s.text || s.piece || '')}
                  className="px-3 py-1.5 rounded-full bg-card hover:bg-card/90 text-foreground text-sm font-semibold transition-all"
                >
                  {s.text || s.piece}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="glass-card p-8 rounded-3xl space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="ios-headline text-foreground font-bold">Khmer NER</h3>
            <div className="text-sm text-muted-foreground">{userTier} plan</div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleNer}
              disabled={loadingNer || !text.trim()}
              className="ios-button w-full disabled:opacity-50"
            >
              {loadingNer ? 'Extracting...' : 'Extract Entities'}
            </button>
          </div>

          <div className="card-compact bg-card border border-border rounded-2xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <Tags className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">Entities</span>
            </div>
            {nerEntities.length === 0 ? (
              <div className="text-muted-foreground text-sm">No entities detected yet.</div>
            ) : (
              <div className="space-y-2">
                {nerEntities.map((entity, idx) => (
                  <div
                    key={`${entity.text || entity.entity || 'entity'}-${idx}`}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-card px-3 py-2 text-sm text-foreground"
                  >
                    <div className="font-semibold text-foreground">{entity.text || entity.entity || 'Entity'}</div>
                    <div className="text-muted-foreground">
                      {entity.label || entity.type || 'UNK'}
                      {typeof entity.score === 'number' ? ` score ${(entity.score * 100).toFixed(1)}%` : ''}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
