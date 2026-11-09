# Isolated HUTH PDF fixtures

**TEST ONLY — DO NOT MERGE OR CHERRY-PICK THIS BRANCH INTO MAIN.**

All fixtures are synthetic and use TESTBETRIEB T99 / MUSTERSTADT. They contain no real customer or station data.

The PDF files are stored as base64 text (.pdf.b64) because the connected GitHub file operation accepts UTF-8 text files, not raw binary uploads. Decode them locally with:

```bash
node scripts/decode-huth-pdf-fixtures.cjs
```

The script writes decoded PDFs to the operating-system temporary directory, not into the repository. This branch is a child of feature/ai-report-import-2026-11-09; the fixture commits exist only on this child branch. Keep all implementation changes on the parent feature branch. Do not open a PR from this fixture branch.
