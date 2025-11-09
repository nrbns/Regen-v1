import os
from functools import lru_cache

import numpy as np
from optimum.onnxruntime import ORTModelForFeatureExtraction
from transformers import AutoTokenizer

EMBED_MODEL_ID = os.getenv("EMBED_MODEL", "BAAI/bge-small-en-v1.5")


@lru_cache(maxsize=1)
def _load_model():
    model = ORTModelForFeatureExtraction.from_pretrained(
        EMBED_MODEL_ID,
        provider="CPUExecutionProvider",
    )
    tokenizer = AutoTokenizer.from_pretrained(EMBED_MODEL_ID)
    return model, tokenizer


def embed_text(text: str) -> list[float]:
    model, tokenizer = _load_model()
    tokens = tokenizer(
        text,
        return_tensors="np",
        padding=True,
        truncation=True,
        max_length=512,
    )
    outputs = model(**tokens)
    # CLS pooling
    vector = outputs.last_hidden_state[:, 0, :].squeeze(0)
    vector = vector / np.linalg.norm(vector)
    return vector.tolist()

