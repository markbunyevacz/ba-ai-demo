"""NLP pipeline utilities for stakeholder analysis and document processing."""
from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

try:
    import spacy
    from spacy.language import Language
except ImportError:  # pragma: no cover - optional dependency
    spacy = None  # type: ignore
    Language = None  # type: ignore

import nltk
from nltk.sentiment import SentimentIntensityAnalyzer

try:
    from sentence_transformers import SentenceTransformer
except ImportError:  # pragma: no cover - optional dependency
    SentenceTransformer = None  # type: ignore

logger = logging.getLogger(__name__)


def _ensure_vader_loaded() -> None:
    """Ensure the VADER lexicon is available for sentiment analysis."""
    try:
        nltk.data.find("sentiment/vader_lexicon.zip")
    except LookupError:  # pragma: no cover - network call
        nltk.download("vader_lexicon")


class NERPipeline:
    """Named entity recognition pipeline built on spaCy."""

    def __init__(self, model_name: str = "en_core_web_sm") -> None:
        self.model_name = model_name
        self._nlp: Optional[Language] = None

    def _load_model(self) -> Optional[Language]:
        if self._nlp is not None:
            return self._nlp

        if spacy is None:  # pragma: no cover - optional dependency
            logger.warning("spaCy is not installed; NERPipeline will be disabled")
            return None

        try:
            self._nlp = spacy.load(self.model_name)
        except OSError:
            logger.warning(
                "spaCy model '%s' not found. Falling back to blank English model.",
                self.model_name,
            )
            self._nlp = spacy.blank("en")
        return self._nlp

    def extract_entities(self, text: str) -> List[Dict[str, Any]]:
        """Extract named entities from text.

        Args:
            text: Source text

        Returns:
            List of extracted entities with metadata
        """
        if not text:
            return []

        nlp = self._load_model()
        if nlp is None:
            return []

        doc = nlp(text)
        entities = []
        for ent in doc.ents:
            entities.append(
                {
                    "text": ent.text,
                    "label": ent.label_,
                    "start": ent.start_char,
                    "end": ent.end_char,
                }
            )
        return entities


class SentimentAnalyzer:
    """Sentiment analysis utilities using NLTK's VADER."""

    def __init__(self) -> None:
        _ensure_vader_loaded()
        self._analyzer = SentimentIntensityAnalyzer()

    def score(self, text: str) -> Dict[str, float]:
        """Calculate sentiment scores for text."""
        if not text:
            return {"neg": 0.0, "neu": 0.0, "pos": 0.0, "compound": 0.0}
        return self._analyzer.polarity_scores(text)


class EmbeddingGenerator:
    """Sentence embedding generator using sentence-transformers."""

    def __init__(self, model_name: str = "all-MiniLM-L6-v2") -> None:
        self.model_name = model_name
        self._model: Optional[SentenceTransformer] = None

    def _load_model(self) -> Optional[SentenceTransformer]:
        if self._model is not None:
            return self._model

        if SentenceTransformer is None:  # pragma: no cover - optional dependency
            logger.warning("sentence-transformers not installed; embeddings disabled")
            return None

        try:
            self._model = SentenceTransformer(self.model_name)
        except Exception as exc:  # pragma: no cover - optional dependency
            logger.warning("Failed to load embedding model '%s': %s", self.model_name, exc)
            self._model = None
        return self._model

    def embed(self, text: str) -> List[float]:
        """Generate embedding vector for text."""
        if not text:
            return []

        model = self._load_model()
        if model is None:
            return []

        vector = model.encode(text, convert_to_numpy=True)
        return vector.tolist()


@dataclass
class StakeholderNLPResult:
    """Aggregated NLP insights for a stakeholder profile."""

    sentiment: Dict[str, float] = field(default_factory=dict)
    entities: List[Dict[str, Any]] = field(default_factory=list)
    embedding: List[float] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "sentiment": self.sentiment,
            "entities": self.entities,
            "embedding": self.embedding,
        }


class StakeholderNLPPipeline:
    """Combines multiple NLP utilities for stakeholder enrichment."""

    def __init__(
        self,
        ner: Optional[NERPipeline] = None,
        sentiment_analyzer: Optional[SentimentAnalyzer] = None,
        embedder: Optional[EmbeddingGenerator] = None,
    ) -> None:
        self.ner = ner or NERPipeline()
        self.sentiment = sentiment_analyzer or SentimentAnalyzer()
        self.embedder = embedder or EmbeddingGenerator()

    def enhance_profile(self, profile: Dict[str, Any], context: str) -> Dict[str, Any]:
        """Enhance a stakeholder profile with NLP insights."""
        result = StakeholderNLPResult()
        result.sentiment = self.sentiment.score(context)
        result.entities = self.ner.extract_entities(context)

        # Limit embedding length to reduce payload size
        embedding = self.embedder.embed(context[:2000])
        if embedding:
            result.embedding = embedding

        profile.setdefault("nlp", {})
        profile["nlp"].update(result.to_dict())
        return profile

    def serialize(self, data: Dict[str, Any]) -> str:
        """Serialize NLP results to JSON string for storage/logging."""
        return json.dumps(data, indent=2, ensure_ascii=False)
