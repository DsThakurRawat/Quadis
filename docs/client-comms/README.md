# Client communications

Drafts written **to** the client. What they sent **to us** lives in
`client-assets/briefs/` — see its INDEX for the material these questions are
based on.

| File | What it is |
|---|---|
| `whatsapp-message.txt` | Round 1, sent. Their replies came back in `client-assets/briefs/2026-07-27-SENSITIVE-answers-and-logins.txt` |
| `whatsapp-message-2.txt` | Round 2, **not yet sent**. Four messages, in send order |
| `client-questions.md` | The running question list, grouped by how urgent each is |

## Round 2, in the order it should go out

1. **Message 5 — passwords.** Send alone, first. Bundled with work questions it
   reads as a footnote and gets skipped, and it is the only one with money
   attached.
2. **Message 6 — pricing.** Asks them to price one worked example rather than
   "which rule is right", because they have now answered that question three
   different ways. Also names both rate documents explicitly, since "the sheet"
   was ambiguous when they had sent two.
3. **Messages 7 and 8** — outstanding access, and the PMS checklist to take into
   their conversation with the revenue manager.

## The one that decides the most

Message 8, question 1: after **Book Now**, does the guest stay on our site or go
to the PMS vendor's own booking page? If it is the vendor's page, then
CheckoutModal, RazorpayService, InvoiceService and the soft-hold engine all stop
being used. Nothing further should be built in the booking or payments path
until that is answered.
