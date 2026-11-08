---
inclusion: manual
description: "Manual button: run the full verifier and report which invariants pass or fail."
---

Run `node tests/verify_chrono.js` from the project root. Summarize the PASS/FAIL lines briefly. If anything fails, find the cause in index.html or src/core and propose a fix without changing src/core/fsm-engine.js unless the failure is inside the engine itself.
