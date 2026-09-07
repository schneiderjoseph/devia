# Frontend

## P0

1. Loading / empty / error / success states for critical flows
2. Forms validate before submit; server remains source of truth
3. No secrets in the client; treat XSS as a first-class risk
4. Destructive actions require confirmation

## P1

1. Responsive layout across mobile/tablet/desktop targets you claim to support
2. Error boundaries for resilient UI shells
3. Performance basics: code splitting, image optimization where relevant
4. Consistent navigation and feedback (toasts/inline errors)

Security note: frontend checks are UX. Authorization is enforced on the API.
