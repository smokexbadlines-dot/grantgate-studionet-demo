"""Direct-mode checks using the official GenLayer Testing Suite."""

from datetime import datetime, timedelta, timezone
import sys


def deploy_grantgate(direct_deploy):
    # Direct-mode reloads the same module in one Python process; GenLayer's
    # single-contract guard otherwise retains the class from the prior test.
    contracts = sys.modules.get("genlayer.gl.genvm_contracts")
    if contracts is not None:
        contracts.__known_contract__ = None
    return direct_deploy("contracts/grant_gate.py")


def address_text(address):
    return address.as_hex if hasattr(address, "as_hex") else "0x" + address.hex()


def test_create_and_immutable_history(direct_vm, direct_deploy, direct_alice, direct_bob):
    direct_vm.check_pickling = True
    direct_vm.warp("2026-10-09T12:00:00+00:00")
    contract = deploy_grantgate(direct_deploy)
    direct_vm.sender = direct_alice
    direct_vm.value = 0
    deadline = int((datetime(2026, 10, 9, 12, tzinfo=timezone.utc) + timedelta(days=2)).timestamp())

    milestone_id = contract.create_milestone(
        "Release dataset",
        "Publish a data file and data dictionary under an open license.",
        address_text(direct_bob),
        deadline,
        10**18,
    )
    record = contract.get_milestone(milestone_id)
    assert record["status"] == "open"
    assert record["budget_wei"] == str(10**18)
    event = contract.get_history_entry(int(record["history_head"]))
    assert event["action"] == "created"
    assert event["previous"] == "0"

    direct_vm.sender = direct_bob
    direct_vm.value = 0
    contract.submit_evidence(milestone_id, "https://example.org/dataset")
    current = contract.get_milestone(milestone_id)
    assert current["status"] == "submitted"
    latest = contract.get_history_entry(int(current["history_head"]))
    assert latest["action"] == "evidence_submitted"
    assert latest["evidence_url"] == "https://example.org/dataset"
    assert latest["previous"] == event["id"]


def test_review_uses_independent_validator_and_preserves_evidence(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    direct_vm.check_pickling = True
    direct_vm.warp("2026-10-09T12:00:00+00:00")
    contract = deploy_grantgate(direct_deploy)
    direct_vm.sender = direct_alice
    direct_vm.value = 0
    milestone_id = contract.create_milestone(
        "Release dataset",
        "Publish a public CSV dataset with a data dictionary and CC BY 4.0 license.",
        address_text(direct_bob),
        int(datetime(2026, 10, 11, 12, tzinfo=timezone.utc).timestamp()),
        10**18,
    )
    direct_vm.sender = direct_bob
    direct_vm.value = 0
    contract.submit_evidence(milestone_id, "https://example.org/dataset")
    direct_vm.mock_web("example.org/dataset", {"status": 200, "body": "This page has a CSV and no data dictionary or license."})
    direct_vm.mock_llm("Publish a public CSV", '{"decision":"revision_required"}')

    assert contract.review(milestone_id) == "revision_required"
    assert direct_vm.run_validator() is True
    assert direct_vm.run_validator(leader_result="accepted") is False
    current = contract.get_milestone(milestone_id)
    assert current["status"] == "revision_required"
    latest = contract.get_history_entry(int(current["history_head"]))
    assert latest["action"] == "reviewed"
    assert latest["evidence_url"] == "https://example.org/dataset"
    assert latest["decision"] == "revision_required"


def test_accepted_review_records_decision_without_transfer(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    direct_vm.check_pickling = True
    direct_vm.warp("2026-10-09T12:00:00+00:00")
    contract = deploy_grantgate(direct_deploy)
    direct_vm.sender = direct_alice
    direct_vm.value = 0
    milestone_id = contract.create_milestone(
        "Release dataset",
        "Publish a public CSV dataset with a data dictionary and CC BY 4.0 license.",
        address_text(direct_bob),
        int(datetime(2026, 10, 11, 12, tzinfo=timezone.utc).timestamp()),
        10**18,
    )
    direct_vm.sender = direct_bob
    direct_vm.value = 0
    contract.submit_evidence(milestone_id, "https://example.org/dataset")
    direct_vm.mock_web("example.org/dataset", {"status": 200, "body": "Public CSV dataset with 1,000 rows, a data dictionary, and CC BY 4.0 license."})
    direct_vm.mock_llm("Publish a public CSV", '{"decision":"accepted"}')
    assert contract.review(milestone_id) == "accepted"
    assert direct_vm.run_validator() is True
    current = contract.get_milestone(milestone_id)
    assert current["status"] == "accepted"
    assert current["budget_wei"] == str(10**18)
    latest = contract.get_history_entry(int(current["history_head"]))
    assert latest["action"] == "reviewed"
    assert latest["decision"] == "accepted"
