# Security Specification & Threat Model

## 1. Data Invariants

- **Transfers Collection (`/transfers/{transferId}`)**:
  - `id`: Non-empty alphanumeric string up to 128 characters.
  - `branchId`: Valid string representing the showroom or warehouse.
  - `branchName`: Name of the showroom or warehouse (max 100 chars).
  - `invoiceNo`: Valid invoice or tracking code (max 100 chars).
  - `amount`: Number >= 0.
  - `status`: Must be one of `['pending', 'verified', 'rejected']`. Once verified or rejected, cannot be reverted to pending.
  - `createdAt`: Valid ISO timestamp or server timestamp.
  - Required fields: `['id', 'branchId', 'branchName', 'invoiceNo', 'status', 'createdAt']`.

- **Messages & Walkie-Talkie Collection (`/messages/{messageId}`)**:
  - `id`: Unique identifier (max 128 chars).
  - `senderId`: Identifier of branch or auditor sending the message.
  - `senderName`: Title/Role of sender (max 100 chars).
  - `targetBranchId`: Destination branch ID or 'all' for company-wide walkie-talkie broadcast.
  - `createdAt`: Timestamp string.
  - Max text length 2000 chars, max audio URL size bounded.
  - Required fields: `['id', 'senderId', 'senderName', 'targetBranchId', 'createdAt']`.

- **Branches Collection (`/branches/{branchId}`)**:
  - `id`: String ID.
  - `name`: Showroom or warehouse name.
  - `code`: Code identifier.
  - `type`: Either `'store'` or `'warehouse'`.
  - `isActive`: Boolean.

---

## 2. The "Dirty Dozen" Malicious Payloads

1. **Payload 1 (Ghost Fields / Shadow Update on Transfer)**: Attempting to insert arbitrary properties (e.g., `{ isHacked: true, backdoor: "active" }`) into a transfer.
2. **Payload 2 (Negative Amount Transfer)**: Attempting to create a transfer with `{ amount: -50000 }` to distort balances.
3. **Payload 3 (Invalid Transfer Status)**: Setting status to an unauthorized state like `{ status: "approved_by_hacker" }`.
4. **Payload 4 (Terminal State Reversion)**: Attempting to mutate a verified transfer back to `status: "pending"` without authorization.
5. **Payload 5 (Junk ID Injection)**: Transfer ID containing invalid characters or overflowing size (e.g. 2KB string).
6. **Payload 6 (Oversized Message Flood Attack)**: Message with text string exceeding 10,000 characters to crash clients.
7. **Payload 7 (Missing Required Fields in Message)**: Sending a message missing `senderId` or `senderName`.
8. **Payload 8 (Invalid Branch Type)**: Creating a branch with `{ type: "admin_override" }` instead of `"store"` or `"warehouse"`.
9. **Payload 9 (Audio Duration Manipulation)**: Audio message with negative duration `{ audioDuration: -99 }`.
10. **Payload 10 (Impersonation of auditor without ID)**: Chat message forged with mismatched sender credentials.
11. **Payload 11 (Non-boolean walkie-talkie flag)**: Setting `isWalkieTalkie` to string `"yes"` or object.
12. **Payload 12 (Blanket Document Deletion)**: Unauthorized deletion of company transfer history.

---

## 3. Test Runner Specification (`firestore.rules.test.ts`)
Each payload must be rejected by Firestore Security Rules with PERMISSION_DENIED.
