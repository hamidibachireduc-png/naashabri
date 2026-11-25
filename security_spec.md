# Security Specification — التعاضدية الوطنية (National Mutual Insurance Portal)

## 1. Data Invariants
1. **Member Profile Ownership & PII Isolation**: A document in `/members/{memberId}` can only be read, created, or updated by the authenticated, email-verified user whose `request.auth.uid == memberId`, or by a verified administrator.
2. **Master Gate on Dependents**: A document in `/members/{memberId}/dependents/{dependentId}` cannot exist without its parent `/members/{memberId}` document existing, and `ownerId` must strictly equal `memberId` and `request.auth.uid`.
3. **Claims Ownership & State Integrity**: A document in `/claims/{claimId}` cannot be created without a valid existing `/members/{request.auth.uid}` profile. On creation, `status` MUST be `"قيد الدراسة"`, `approvedAmount` MUST be `0`, and `reviewerNote` MUST be `""`.
4. **Terminal State Locking**: Claims in `"تم الصرف"` or `"مرفوض"` and Authorizations in `"موافق عليه"` or `"مرفوض"` cannot be modified by members (only administrators may adjust them).
5. **Temporal Integrity**: `createdAt` and `updatedAt` must strictly equal `request.time` on creation, and `createdAt` is immutable on update while `updatedAt == request.time`.
6. **Zero Query Trust**: Every `allow list` rule strictly evaluates `resource.data.ownerId == request.auth.uid` (or `isAdmin()`), never delegating filtering solely to the client.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Identity Spoofing on Member Create**: User A attempts to create `/members/userB` with `uid: "userB"`. -> `PERMISSION_DENIED`.
2. **Self-Assigned Admin / Status Escalation**: Member attempts to create `/members/userA` with an extra shadow field `isAdmin: true`. -> `PERMISSION_DENIED` (`hasOnly` blocks shadow fields).
3. **PII Read Leak**: User A attempts `get` or `list` on `/members/userB`. -> `PERMISSION_DENIED`.
4. **Orphan Dependent Creation**: Unregistered user without `/members/userA` attempts to create `/members/userA/dependents/dep1`. -> `PERMISSION_DENIED` (Master Gate `exists()` fails).
5. **Claim Auto-Approval Fraud**: User A creates `/claims/c1` with `status: "تم الصرف"` and `approvedAmount: 50000`. -> `PERMISSION_DENIED`.
6. **Claim Owner Spoofing**: User A creates `/claims/c1` with `ownerId: "userB"`. -> `PERMISSION_DENIED`.
7. **Shadow Update on Claim**: User A updates `/claims/c1` injecting `approvedAmount: 9000` or `reviewerNote: "Approved"`. -> `PERMISSION_DENIED` (`affectedKeys().hasOnly(...)` rejects).
8. **Terminal State Mutation**: User A attempts to edit a claim whose existing status is `"تم الصرف"`. -> `PERMISSION_DENIED`.
9. **ID Poisoning**: User A attempts to create `/claims/<2000-char-invalid-id!@#>` -> `PERMISSION_DENIED` (`isValidId()` fails).
10. **Timestamp Backdating**: User A creates a claim with `createdAt: "2020-01-01T00:00:00Z"` instead of `request.time`. -> `PERMISSION_DENIED`.
11. **Unverified Email Spoof**: Request with matching admin email where `request.auth.token.email_verified == false`. -> `PERMISSION_DENIED`.
12. **Blanket List Scraping**: Non-admin user attempts `list` on `/claims` without filtering `ownerId == request.auth.uid`. -> `PERMISSION_DENIED`.
