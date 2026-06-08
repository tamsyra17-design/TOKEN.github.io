# Enterprise Smart Hospital Token Management System Security Specification

## 1. Data Invariants
1. **No Rogue Token Creation**: A token must always point to a valid, existing doctor in the system.
2. **Access Control Hierarchy**: Only accounts with the 'admin' role can modify global hospital settings or delete doctor profiles.
3. **No Identity Spoofing**: Users can only register/modify their own user profile document.
4. **Strict Immutable Timestamps**: Token creation times, user creation times, and update times must match the server's time (`request.time`).
5. **Rogue Field Protection**: Clients cannot inject undefined properties (such as bypass flags, "isVerified", or "isAdmin" flags) into tokens or profiles.
6. **Immutable Tokens Fields**: Once a token is created, its `tokenNumber`, `patientName`, and `doctorId` are strictly immutable to prevent retrospective queue manipulation.
7. **Status-Locked State Transitions**: A token in the terminal state ('completed' or 'skipped') cannot be moved back to 'waiting' or 'called'.

---

## 2. The "Dirty Dozen" Payloads (Red Team Penetration Scenarios)

### Payload 1: Identity Spoofing in Profiles
An attacker tries to create or update a user profile under someone else's UID.
```json
// Path: /users/attacker123
// Auth: UID 'malicious_user_xyz'
{
  "uid": "attacker123",
  "name": "Intruder User",
  "email": "intruder@gmail.com",
  "role": "admin",
  "createdAt": "2026-06-08T07:15:00Z"
}
```
*Expected Result: PERMISSION_DENIED (UID field must match request.auth.uid)*

### Payload 2: Self-Promotion to Admin
An authenticated receptionist attempts to update their own role property to `admin`.
```json
// Path: /users/receptionist777
// Auth: UID 'receptionist777', Role in DB: 'receptionist'
{
  "role": "admin"
}
```
*Expected Result: PERMISSION_DENIED (Staff role modification blocked unless modified by actual Admin)*

### Payload 3: Spoofing Client Timestamps for Tokens
A user attempts to create a token with a backdated or future timestamp to gain queue priority.
```json
// Path: /tokens/token_scammed
// Auth: UID 'receptionist777'
{
  "tokenId": "token_scammed",
  "tokenNumber": 45,
  "patientName": "Scammed Turn",
  "doctorId": "doc_heart",
  "status": "waiting",
  "createdAt": "1999-01-01T00:00:00Z", // Backdated
  "priority": "normal"
}
```
*Expected Result: PERMISSION_DENIED (createdAt must equal request.time)*

### Payload 4: Overwriting Global Settings
A regular receptionist attempts to edit the global settings document to disable WhatsApp notifications and lower limits.
```json
// Path: /settings/config
// Auth: UID 'receptionist777'
{
  "hospitalName": "Hacked Medical Center",
  "whatsappEnabled": false
}
```
*Expected Result: PERMISSION_DENIED (Only verified Admin records can write to settings)*

### Payload 5: Retrospective Token Number Alteration
A receptionist tries to alter the sequence order (tokenNumber) of an existing token.
```json
// Path: /tokens/token444
// Auth: UID 'receptionist777'
{
  "tokenNumber": 1 // Altered from 40
}
```
*Expected Result: PERMISSION_DENIED (tokenNumber is immutable upon creation)*

### Payload 6: Rogue State-Lock Bypass
A doctor tries to reopen completed token records back to 'waiting'.
```json
// Path: /tokens/token444 (Already completed in DB)
// Auth: UID 'doctor_green'
{
  "status": "waiting"
}
```
*Expected Result: PERMISSION_DENIED (Terminal status prevents state backward transitions)*

### Payload 7: Denial of Wallet Resource Poisoning
An attacker tries to feed exceptionally large string arrays or fields to exhaustion.
```json
// Path: /tokens/oversized_token
// Auth: UID 'receptionist777'
{
  "patientName": "An exceptionally long name designed to waste database resource... [1MB client string payload block ...]"
}
```
*Expected Result: PERMISSION_DENIED (Enforced field size constraints in rules)*

### Payload 8: Rogue Doctor Chamber Theft
A therapist attempts to delete another doctor's profile document or occupy their room.
```json
// Path: /doctors/dr_smith
// Auth: UID 'dr_jones'
{
  "roomNumber": "Chamber 205" // Overriding Dr. Smith's room
}
```
*Expected Result: PERMISSION_DENIED (Only Admins or the matching Doctor UID can edit doctor profiles)*

### Payload 9: Empty/Malformed Writes
An attacker writes an object missing required schemas.
```json
// Path: /tokens/blank_token
// Auth: UID 'receptionist777'
{
  "tokenId": "blank_token"
}
```
*Expected Result: PERMISSION_DENIED (Missing standard required properties like patientName, doctorId)*

### Payload 10: Unauthorized Blanket Querying of All Patients
An unauthenticated or regular guest client requests a general list query over all patient tokens without specific doctor filters or ownership context.
```json
// Path: /tokens
// Auth: Unauthenticated
// Query: Select * from tokens
```
*Expected Result: PERMISSION_DENIED (Blanket queries must restrict items to matching conditions)*

### Payload 11: Spoofed Email-Verification Verification
An attacker sends a write pretending to be verified without establishing real credential checks.
```json
// Path: /settings/config
// Auth: UID 'attacker', Email 'admin@hospital.com', verified: false
```
*Expected Result: PERMISSION_DENIED (Requires strict auth.token.email_verified == true check for Write)*

### Payload 12: Injection of Rogue Fields (Ghost Fields)
A user tries to inject a field "bypassChecks: true" when updating token progress.
```json
// Path: /tokens/tok123
// Auth: UID 'doctor_green'
{
  "status": "completed",
  "bypassChecks": true
}
```
*Expected Result: PERMISSION_DENIED (Strict affectedKeys check limits updates to only whitelisted variables)*

---

## 3. Test Script Outline
A local firestore testing environment or defensive rules validation will enforce these boundary checks. We will write and deploy the firestore.rules file to be mathematically secure against all of these vectors.
