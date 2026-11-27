from app.algorithms.study_partner import AcademicProfile, cosine_similarity, hybrid_score, overlap_score


def test_overlap_score_is_normalized():
    assert overlap_score(["Python", "SQL"], ["python", "Java"]) == 33.33333333333333


def test_cosine_handles_empty_and_zero_vectors():
    assert cosine_similarity([], []) == 0
    assert cosine_similarity([0, 0], [1, 1]) == 0


def test_hybrid_score_is_bounded_and_explained():
    score, reasons = hybrid_score(AcademicProfile(skills=frozenset({"python"})), AcademicProfile(skills=frozenset({"python"})))
    assert 0 <= score <= 100
    assert reasons
