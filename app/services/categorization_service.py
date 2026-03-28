import re
import logging
import joblib
from pathlib import Path

logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parent.parent
_MODEL_PATH = BASE_DIR / "model" / "categorizer.pkl"

_pipeline = None


def _preprocess(text: str) -> str:
    text = str(text).lower().strip()
    text = re.sub(r'[^a-z0-9\s]', ' ', text)
    text = re.sub(r'\s+', ' ', text)
    return text.strip()


def _load_model():
    global _pipeline

    if not _MODEL_PATH.exists():
        logger.warning(f"Model not found at {_MODEL_PATH}")
        return

    try:
        _pipeline = joblib.load(_MODEL_PATH)
        print("✅ MODEL LOADED:", _MODEL_PATH)

    except Exception as e:
        logger.error(f"❌ Failed to load categorization model: {e}")
        _pipeline = None


_load_model()


def predict_with_confidence(description: str) -> tuple[str, float]:
    if _pipeline is None:
        return "Others", 0.0

    if not description or not description.strip():
        return "Others", 0.0

    try:
        clean = _preprocess(description)

        proba = _pipeline.predict_proba([clean])[0]

        best_idx = proba.argmax()
        confidence = float(proba[best_idx])
        category = _pipeline.classes_[best_idx]

        return category, confidence

    except Exception as e:
        logger.error(f"Prediction failed: {e}")
        return "Others", 0.0