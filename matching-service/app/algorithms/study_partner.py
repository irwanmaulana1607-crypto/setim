"""Deterministic study-partner scoring primitives.

The engine accepts normalized academic attributes from a repository/service layer;
it does not invent missing profile data.
"""
from dataclasses import dataclass
from math import sqrt
from typing import Iterable

WEIGHTS = {"courses": 0.30, "skills": 0.25, "objectives": 0.20, "availability": 0.15, "interests": 0.10}
HYBRID_WEIGHTED = 0.70
HYBRID_COSINE = 0.30


def overlap_score(left: Iterable[str], right: Iterable[str]) -> float:
    a, b = {item.strip().lower() for item in left if item.strip()}, {item.strip().lower() for item in right if item.strip()}
    if not a or not b:
        return 0.0
    return len(a & b) / len(a | b) * 100


def cosine_similarity(left: list[float], right: list[float]) -> float:
    if not left or not right or len(left) != len(right):
        return 0.0
    magnitude_left = sqrt(sum(value * value for value in left))
    magnitude_right = sqrt(sum(value * value for value in right))
    if magnitude_left == 0 or magnitude_right == 0:
        return 0.0
    return max(0.0, min(1.0, sum(a * b for a, b in zip(left, right)) / (magnitude_left * magnitude_right))) * 100


@dataclass(frozen=True)
class AcademicProfile:
    courses: frozenset[str] = frozenset()
    skills: frozenset[str] = frozenset()
    objectives: frozenset[str] = frozenset()
    availability: frozenset[str] = frozenset()
    interests: frozenset[str] = frozenset()


def hybrid_score(request: AcademicProfile, candidate: AcademicProfile) -> tuple[float, list[str]]:
    scores = {criterion: overlap_score(getattr(request, criterion), getattr(candidate, criterion)) for criterion in WEIGHTS}
    weighted = sum(scores[key] * weight for key, weight in WEIGHTS.items())
    vocabulary = sorted(set().union(*[getattr(request, key) | getattr(candidate, key) for key in WEIGHTS]))
    request_vector = [float(token in getattr(request, "courses") | request.skills | request.objectives | request.interests) for token in vocabulary]
    candidate_vector = [float(token in getattr(candidate, "courses") | candidate.skills | candidate.objectives | candidate.interests) for token in vocabulary]
    score = round(weighted * HYBRID_WEIGHTED + cosine_similarity(request_vector, candidate_vector) * HYBRID_COSINE, 2)
    reasons: list[str] = []
    for label, key in (("courses", "courses"), ("skills", "skills"), ("learning objectives", "objectives"), ("availability slots", "availability"), ("interests", "interests")):
        shared = getattr(request, key) & getattr(candidate, key)
        if shared: reasons.append(f"Shares {len(shared)} relevant {label}.")
    return max(0.0, min(100.0, score)), reasons
