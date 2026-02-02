# File: frontend/src/hooks/useConfirmDialog.ts

- [ ] Read and understand this file

What it is:
- Hook to manage confirm/alert state.

What it does (easy words):
- `requestConfirm()` shows a confirm dialog and returns true/false.
- `requestAlert()` shows a message with only OK.

Practical example:
- Delete button calls `requestConfirm()`, and only deletes if it returns true.
