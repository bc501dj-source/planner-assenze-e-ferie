# Security Specification: Planner Assenze Firestore Rules

## 1. Data Invariants
1. Every document at `/planners/{userId}` belongs strictly to the authenticated, email-verified user whose `request.auth.uid == userId`.
2. `ownerId` is immutable after creation and must equal both `userId` and `request.auth.uid`.
3. `absences` must be a Firestore `map` with at most 350 entries whose values are exclusively `'festivo'`, `'licenza'`, or `'l104'`.
4. `createdAt` and `updatedAt` must equal `request.time` on creation; `createdAt` is immutable and `updatedAt` must equal `request.time` on update.
5. No unauthenticated access, no cross-user reads/writes, and no collection `list` queries are allowed.

## 2. Adversarial "Dirty Dozen" Payloads (Expected: PERMISSION_DENIED)
1. Unauthenticated `get` on `/planners/userA`.
2. Authenticated `userB` attempting `get` on `/planners/userA`.
3. Authenticated `userA` with `email_verified: false` attempting `create` on `/planners/userA`.
4. Authenticated `userA` attempting `create` with spoofed `ownerId: "userB"`.
5. Authenticated `userA` attempting `create` with a ghost field `isAdmin: true`.
6. Authenticated `userA` attempting `create` with invalid `absences` value (`"invalid_type"`).
7. Authenticated `userA` attempting `create` with oversized `absences` map (> 350 keys).
8. Authenticated `userA` attempting `create` with client-forged `createdAt` (`!= request.time`).
9. Authenticated `userA` attempting `update` changing `ownerId` or `createdAt`.
10. Authenticated `userA` attempting `update` with client-forged `updatedAt` (`!= request.time`).
11. Authenticated `userA` attempting `list` on `/planners`.
12. Path poisoning `create` on `/planners/bad$id!with@chars`.
