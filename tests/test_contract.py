"""Behavior checks for GrantGate's state machine using a small GenLayer stub.

These tests exercise Python control flow. They do not replace GenVM or testnet runs.
"""

import importlib.util
import re
import sys
import types
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path


class Address(str):
    def __new__(cls, value):
        if not re.fullmatch(r"0x[a-fA-F0-9]{40}", value):
            raise ValueError("Invalid address")
        return str.__new__(cls, value)

    @property
    def as_hex(self):
        return str(self)


class DynArray:
    def __class_getitem__(cls, _item):
        return list


class Return:
    def __init__(self, calldata):
        self.calldata = calldata


class WriteDecorator:
    def __call__(self, method):
        return method

    payable = staticmethod(lambda method: method)


class Public:
    view = staticmethod(lambda method: method)
    write = WriteDecorator()


class VM:
    Return = Return

    class UserError(Exception):
        pass

    @staticmethod
    def run_nondet_unsafe(leader, validator):
        result = leader()
        if not validator(Return(result)):
            raise AssertionError("Validator disagreed")
        return result


class Web:
    page = "A published dataset with a data dictionary, license and public download."

    def render(self, _url, mode="text"):
        assert mode == "text"
        return self.page


class Nondet:
    web = Web()
    decisions = ["accepted"]

    def exec_prompt(self, _prompt, response_format="json"):
        assert response_format == "json"
        return {"decision": self.decisions.pop(0) if len(self.decisions) > 1 else self.decisions[0]}


gl = types.SimpleNamespace(
    Contract=object,
    public=Public(),
    vm=VM(),
    nondet=Nondet(),
    message=types.SimpleNamespace(sender_address=None, value=0),
    message_raw={"datetime": "2026-10-09T12:00:00+00:00"},
)
stub = types.ModuleType("genlayer")
stub.gl = gl
stub.Address = Address
stub.DynArray = DynArray
stub.u256 = int
sys.modules["genlayer"] = stub
source = Path(__file__).resolve().parents[1] / "contracts" / "grant_gate.py"
spec = importlib.util.spec_from_file_location("grant_gate_under_test", source)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

FUNDER = Address("0x" + "1" * 40)
RECIPIENT = Address("0x" + "2" * 40)
STRANGER = Address("0x" + "3" * 40)
NOW = datetime(2026, 10, 9, 12, tzinfo=timezone.utc)


class GrantGateBehavior(unittest.TestCase):
    def setUp(self):
        self.contract = module.GrantGate()
        for name in (
            "titles", "rubrics", "sponsors", "recipients", "budgets", "deadlines",
            "statuses", "evidence_urls", "decisions", "history_heads",
            "history_milestone_ids", "history_actions", "history_urls",
            "history_decisions", "history_timestamps", "history_previous",
        ):
            setattr(self.contract, name, [])
        gl.nondet.decisions = ["accepted"]
        gl.nondet.web.page = Web.page
        self.as_sender(FUNDER)
        self.set_time(NOW)

    def as_sender(self, address, value=0):
        gl.message.sender_address = address
        gl.message.value = value

    def set_time(self, when):
        gl.message_raw["datetime"] = when.isoformat()

    def create(self):
        deadline = int((NOW + timedelta(days=2)).timestamp())
        return self.contract.create_milestone(
            "Release dataset", "Publish a data file and data dictionary under an open license.",
            str(RECIPIENT), deadline, 10**18,
        )

    def test_acceptance_records_decision_and_preserves_history(self):
        milestone_id = self.create()
        self.as_sender(RECIPIENT)
        self.contract.submit_evidence(milestone_id, "https://example.org/first")
        self.assertEqual(self.contract.review(milestone_id), "accepted")
        milestone = self.contract.get_milestone(milestone_id)
        self.assertEqual(milestone["status"], "accepted")
        self.assertEqual(milestone["budget_wei"], str(10**18))
        latest = self.contract.get_history_entry(int(milestone["history_head"]))
        submitted = self.contract.get_history_entry(int(latest["previous"]))
        created = self.contract.get_history_entry(int(submitted["previous"]))
        self.assertEqual([latest["action"], submitted["action"], created["action"]],
                         ["reviewed", "evidence_submitted", "created"])
        self.assertEqual(submitted["evidence_url"], "https://example.org/first")
        self.assertEqual(created["previous"], "0")

    def test_revision_keeps_prior_evidence_and_can_resubmit(self):
        milestone_id = self.create()
        self.as_sender(RECIPIENT)
        self.contract.submit_evidence(milestone_id, "https://example.org/first")
        gl.nondet.decisions = ["revision_required"]
        self.contract.review(milestone_id)
        self.contract.submit_evidence(milestone_id, "https://example.org/second")
        self.assertEqual(self.contract.get_milestone(milestone_id)["status"], "submitted")
        self.assertIn("https://example.org/first", self.contract.history_urls)
        self.assertIn("https://example.org/second", self.contract.history_urls)

    def test_only_recipient_can_submit_and_private_urls_are_rejected(self):
        milestone_id = self.create()
        self.as_sender(STRANGER)
        with self.assertRaises(VM.UserError):
            self.contract.submit_evidence(milestone_id, "https://example.org/data")
        self.as_sender(RECIPIENT)
        for url in ("http://example.org/data", "https://localhost/data",
                    "https://127.0.0.1/data", "https://user:pass@example.org/data"):
            with self.subTest(url=url), self.assertRaises(VM.UserError):
                self.contract.submit_evidence(milestone_id, url)
        self.assertEqual(self.contract.get_milestone(milestone_id)["status"], "open")

    def test_expiry_grace_and_close(self):
        milestone_id = self.create()
        self.as_sender(FUNDER)
        self.set_time(NOW + timedelta(days=9))
        with self.assertRaises(VM.UserError):
            self.contract.close_expired(milestone_id)
        self.set_time(NOW + timedelta(days=9, seconds=1))
        self.contract.close_expired(milestone_id)
        self.assertEqual(self.contract.get_milestone(milestone_id)["status"], "closed")
        with self.assertRaises(VM.UserError):
            self.contract.close_expired(milestone_id)

    def test_validator_disagreement_cannot_accept(self):
        milestone_id = self.create()
        self.as_sender(RECIPIENT)
        self.contract.submit_evidence(milestone_id, "https://example.org/data")
        gl.nondet.decisions = ["accepted", "revision_required"]
        with self.assertRaises(AssertionError):
            self.contract.review(milestone_id)
        self.assertEqual(self.contract.get_milestone(milestone_id)["status"], "submitted")


if __name__ == "__main__":
    unittest.main()
