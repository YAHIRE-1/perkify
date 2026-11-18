# Quest notifications

Perkify records new participants and submitted evidence for the creator. The participant receives an update when their evidence is approved or rejected. The in-app inbox works without an email address.

## Database

Generate and apply the Drizzle migration for the two new tables before starting a server with this change.

```sh
pnpm run db:generate
pnpm run db:migrate
```

Restart the API after applying the migration. The development process does not watch shared router files outside `apps/server`, so an older process can return `404` for the new routes until it restarts.

## Email

Set these variables in the API server environment or the repository's local `.env.local`, then restart the API. Varlock loads `SMTP_*` into the server. Perkify uses `CORS_ORIGIN` for links to the quest and email preferences.

| Variable | Value |
| --- | --- |
| `SMTP_HOST` | Relay hostname |
| `SMTP_PORT` | Provider port. The default is `587` for STARTTLS, `465` for TLS and `1025` for local plain mode. |
| `SMTP_SECURE` | Set to `true` for implicit TLS or `false` for STARTTLS. If omitted, port 465 uses TLS and other ports use STARTTLS. |
| `SMTP_SECURITY` | Optional explicit mode. Use `starttls`, `tls` or `plain` for an unauthenticated development relay. |
| `SMTP_USER` | Relay username. Set together with `SMTP_PASS` when the provider requires authentication. |
| `SMTP_PASS` | Relay password or SMTP credential |
| `SMTP_FROM` | Authorized sender, for example `Perkify <notifications@example.com>` |

For a local SMTP catcher listening on port 1025, set `SMTP_HOST=127.0.0.1`, `SMTP_SECURITY=plain` and a test `SMTP_FROM`. Leave the credentials unset. For a hosted relay, use the provider's TLS and sender settings. [Nodemailer SMTP options](https://nodemailer.com/smtp)

Users can verify one address per account under **Profile → Email notifications**. After verification, they can turn delivery on or off. Quest emails retry in the background, and opting out stops queued messages that have yet to be sent. A message can be delivered twice if the relay accepts it but the connection drops before Perkify receives confirmation.
