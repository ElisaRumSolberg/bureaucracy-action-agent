"""Unit tests for the pure helper functions in app/routes/cases.py: the
case-level Next Best Action ranking, the aggregated risk stats, and
deterministic cross-document deadline-conflict detection. These are the
"cheap, safe slice of cross-document reasoning" the case feature ships with
— no LLM involved, no cross-document dependency inference."""

from app.routes.cases import _case_next_best_action, _case_risk_stats, _detect_deadline_conflicts


def task(
    id_,
    title,
    priority="medium",
    dependencies=None,
    deadline=None,
    status="todo",
    is_conditional=False,
    condition_status="unknown",
):
    return {
        "id": id_,
        "title": title,
        "priority": priority,
        "dependencies": dependencies or [],
        "deadline": deadline,
        "status": status,
        "is_conditional": is_conditional,
        "condition_status": condition_status,
    }


def doc(document_id, filename, tasks, missing_information=None):
    return {
        "document_id": document_id,
        "filename": filename,
        "tasks": tasks,
        "missing_information": missing_information or [],
    }


# --- _case_next_best_action -------------------------------------------------


def test_picks_the_best_candidate_across_two_documents():
    doc_a_tasks = [task("t_a_0", "Low priority in A", priority="low")]
    doc_b_tasks = [task("t_b_0", "High priority in B", priority="high")]
    candidates = [
        ("doc_a", "a.pdf", doc_a_tasks),
        ("doc_b", "b.pdf", doc_b_tasks),
    ]
    result = _case_next_best_action(candidates)
    assert result["document_id"] == "doc_b"
    assert result["task"]["title"] == "High priority in B"


def test_a_requirement_from_document_a_can_be_recommended_alongside_document_b():
    """A task from Document A with no dependencies on Document B's tasks is
    still eligible for the case-wide recommendation — documents coexist in
    the same case without needing to reference each other."""
    doc_a_tasks = [task("t_a_0", "Bank statement", priority="high")]
    doc_b_tasks = [task("t_b_0", "Visa form", priority="high", dependencies=[])]
    candidates = [("doc_a", "a.pdf", doc_a_tasks), ("doc_b", "b.pdf", doc_b_tasks)]
    result = _case_next_best_action(candidates)
    assert result is not None
    assert result["document_id"] in {"doc_a", "doc_b"}


def test_no_actionable_task_across_any_document_returns_none():
    candidates = [
        ("doc_a", "a.pdf", [task("t_a_0", "Done", status="done")]),
        (
            "doc_b",
            "b.pdf",
            [
                task("t_b_0", "Blocked", dependencies=[1]),
                task("t_b_1", "Also blocked", dependencies=[0]),
            ],
        ),
    ]
    assert _case_next_best_action(candidates) is None


# --- _case_risk_stats --------------------------------------------------------


def test_risk_stats_aggregate_across_documents():
    documents_out = [
        doc(
            "doc_a",
            "a.pdf",
            [
                task("t_a_0", "Blocker", priority="high"),
                task("t_a_1", "Blocked", dependencies=[0]),
            ],
            missing_information=["Missing A"],
        ),
        doc(
            "doc_b",
            "b.pdf",
            [task("t_b_0", "Unanswered condition", is_conditional=True, condition_status="unknown")],
        ),
    ]
    stats = _case_risk_stats(documents_out)
    assert stats["document_count"] == 2
    assert stats["task_count"] == 3
    assert stats["blocked_count"] == 1
    assert stats["unanswered_conditions"] == 1
    assert stats["missing_information_count"] == 1


def test_not_applicable_task_does_not_count_as_blocked_or_unanswered():
    documents_out = [
        doc(
            "doc_a",
            "a.pdf",
            [task("t_a_0", "Excluded", is_conditional=True, condition_status="not_applicable")],
        )
    ]
    stats = _case_risk_stats(documents_out)
    assert stats["blocked_count"] == 0
    assert stats["unanswered_conditions"] == 0


def test_missing_information_does_not_crash_stats_when_absent():
    """A document dict missing the 'missing_information' key entirely (e.g.
    an older document) must not crash the aggregation."""
    documents_out = [
        {"document_id": "doc_a", "filename": "a.pdf", "tasks": [task("t_a_0", "T")]},
    ]
    stats = _case_risk_stats(documents_out)
    assert stats["missing_information_count"] == 0


# --- _detect_deadline_conflicts ----------------------------------------------


def test_same_deadline_across_two_documents_is_flagged():
    documents_out = [
        doc("doc_a", "a.pdf", [task("t_a_0", "Submit A", deadline="2026-09-05")]),
        doc("doc_b", "b.pdf", [task("t_b_0", "Submit B", deadline="2026-09-05")]),
    ]
    conflicts = _detect_deadline_conflicts(documents_out)
    assert len(conflicts) == 1
    assert conflicts[0]["deadline"] == "2026-09-05"
    assert {t["document_id"] for t in conflicts[0]["tasks"]} == {"doc_a", "doc_b"}


def test_same_deadline_within_one_document_is_not_a_conflict():
    """Two tasks in the SAME document sharing a deadline is normal (e.g. two
    steps due the same day) — conflicts only matter across documents, since
    within one document the user already sees both side by side."""
    documents_out = [
        doc(
            "doc_a",
            "a.pdf",
            [
                task("t_a_0", "Step 1", deadline="2026-09-05"),
                task("t_a_1", "Step 2", deadline="2026-09-05"),
            ],
        )
    ]
    assert _detect_deadline_conflicts(documents_out) == []


def test_done_tasks_are_excluded_from_conflict_detection():
    documents_out = [
        doc("doc_a", "a.pdf", [task("t_a_0", "Submit A", deadline="2026-09-05", status="done")]),
        doc("doc_b", "b.pdf", [task("t_b_0", "Submit B", deadline="2026-09-05")]),
    ]
    assert _detect_deadline_conflicts(documents_out) == []


def test_no_conflicts_when_deadlines_differ():
    documents_out = [
        doc("doc_a", "a.pdf", [task("t_a_0", "Submit A", deadline="2026-09-01")]),
        doc("doc_b", "b.pdf", [task("t_b_0", "Submit B", deadline="2026-09-30")]),
    ]
    assert _detect_deadline_conflicts(documents_out) == []


def test_missing_information_present_does_not_crash_next_best_action():
    """A document carrying missing_information must not affect (or crash)
    the case-level recommendation — missing_information is purely
    informational, next_best_action never reads it."""
    candidates = [("doc_a", "a.pdf", [task("t_a_0", "Only task", priority="high")])]
    documents_out = [doc("doc_a", "a.pdf", candidates[0][2], missing_information=["Bank account number"])]
    stats = _case_risk_stats(documents_out)  # must not raise
    result = _case_next_best_action(candidates)  # must not raise
    assert stats["missing_information_count"] == 1
    assert result["task"]["title"] == "Only task"


def test_duplicate_equivalent_tasks_across_documents_are_not_merged():
    """Documented current behavior, not a bug: validate_tasks only dedupes
    tasks *within* a single document's own extraction pass. Across two
    documents in the same case, an equivalent task appears twice — the case
    feature deliberately does not attempt cross-document merging (see
    Future Improvements in the README)."""
    candidates = [
        ("doc_a", "a.pdf", [task("t_a_0", "Upload passport", priority="medium")]),
        ("doc_b", "b.pdf", [task("t_b_0", "Upload passport", priority="medium")]),
    ]
    documents_out = [
        doc("doc_a", "a.pdf", candidates[0][2]),
        doc("doc_b", "b.pdf", candidates[1][2]),
    ]
    titles = [t["title"] for d in documents_out for t in d["tasks"]]
    assert titles == ["Upload passport", "Upload passport"]  # both present, not deduplicated
    assert _case_risk_stats(documents_out)["task_count"] == 2
