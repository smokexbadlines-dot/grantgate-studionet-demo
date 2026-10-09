# GrantGate

GrantGate is a GenLayer-native **Studionet submission demo** for reviewing grant milestones against public evidence. A sponsor publishes a frozen rubric, recipient, deadline, and proposed budget. The recipient submits a public HTTPS page. GenLayer validators fetch the page independently and compare their decisions. The result and every prior submission remain in Intelligent Contract storage.

**This is a decision demo, not an escrow.** The proposed GEN budget is display-only. `create_milestone` is not payable, and the contract never sends GEN or promises a grant payout. Studio's balances are simulated and it has no EVM transfer layer.

## Run the site

```sh
pnpm install
pnpm dev
```

Run `pnpm build` for the static bundle. The published interface defaults to the deployed Studionet contract `0xB979f7467dF61af3DB3346555aF98b8BC8230B1f`. A viewer can replace that address in Settings. If no address is configured, the interface labels local illustrative records as examples and never presents them as onchain data.

## Deploy to Studionet

Use [GenLayer Studio](https://studio.genlayer.com/) to load and deploy `contracts/grant_gate.py`, or use the GenLayer CLI with a Studionet account:

```sh
genvm-lint check contracts/grant_gate.py
genlayer network set studionet
genlayer network info
genlayer deploy --contract contracts/grant_gate.py
```

Studionet is chain ID `61999` at `https://studio.genlayer.com/api`. Studio has a built-in faucet in its account selector. Wait for the deploy transaction to finalize and confirm successful execution. Paste the resulting **public contract address** into GrantGate Settings if you deploy another instance. The browser uses stable `genlayer-js` v1.1.8 with the `studionet` chain preset, reads finalized state, and persists submitted transaction IDs so an interrupted write can be tracked again.

## Live submission proof

The default contract is [deployed on Studionet](https://explorer-studio.genlayer.com/address/0xB979f7467dF61af3DB3346555aF98b8BC8230B1f). Milestone `#0`, “Verify Studionet network facts,” has a frozen rubric, a public [GenLayer Networks page](https://docs.genlayer.com/developers/networks) as evidence, an `accepted` validator decision, and three contract history entries. These Studionet transactions finalized successfully:

| Action | Transaction |
| --- | --- |
| Deploy contract | `0x324730af98b5c6dfbc1fdc31529db73354798658bdd096e1340e06769f193301` |
| Create milestone | `0x90cca3f9cc2972a1423323c93483fb9d78a4d39f1bd4b8be2f57949cdbf96bf5` |
| Submit evidence | `0xd3fde16aa1100d274b351581d048e902e281ee8a303d545107740ff663512dc3` |
| Validator review | `0x696f29eb1a140f7a02eab46a2726d8e1188b90c71f8dbca0df87f17772ddf4f7` |

The public site opens on this live record without a wallet. A wallet is only needed to write a new milestone or evidence submission from the browser. The native write flow was exercised in GenLayer Studio with full consensus.

## Demonstrate the native flow

1. Connect a Studionet-compatible wallet and publish a milestone with a specific, observable rubric. The budget is a proposal only.
2. Connect as the recipient and submit a public HTTPS evidence URL before the deadline.
3. Ask validators to review. The contract uses GenLayer web access and an LLM inside a nondeterministic operation. Each validator repeats the evidence assessment; disagreement cannot silently become an accepted result.
4. Inspect `accepted`, `revision_required`, or `inconclusive` in the finalized contract state and follow the linked onchain activity entries. A recipient can resubmit after a non-accepted decision before the deadline. The sponsor can close an unaccepted milestone seven days after expiry.

The browser is an interface; the Intelligent Contract is the authority for rubric, parties, proposed budget, evidence URLs, decisions, status, and history.

## Checks

```sh
pnpm build
genvm-lint check contracts/grant_gate.py
python -m unittest discover -s tests -p test_contract.py -v
```

`tests/test_direct.py` is an optional GenLayer direct-mode suite (`genlayer-test==0.29.2`) covering state, history, and independent-review comparison. Its web and model responses are mocked. A successful local test does not substitute for one finalized Studionet deployment and review transaction.

## Scope

The contract assesses one public HTTPS page per submission. It stores references and decisions, not an archived copy of the page, and does not prove the page author controls the recipient wallet. Use stable public sources and precise rubrics for a credible demo. Studionet is hosted development infrastructure, so its state should not be treated as production persistence.
