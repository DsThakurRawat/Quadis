# DNS cutover for quadishotels.com

Verified live on 27 Jul 2026, and it changes the plan in one important way.

## What is actually true today

```
A       quadishotels.com  ->  115.124.108.190          (theserverindia shared hosting)
MX      quadishotels.com  ->  1 smtp.google.com        (Google Workspace)
NS      quadishotels.com  ->  yellow1.theserverindia.com
                              yellow2.theserverindia.com
```

Two things follow, and the second is the one people get wrong.

**Mail is on Google, not on the web host.** The client said *"Mail id gmail pr
chlti h baki server k through bni h ye"* and the MX record confirms it. So
moving the website does not, by itself, touch mail delivery.

**The domain is registered at GoDaddy but its DNS is served by
theserverindia.** The nameservers are `yellow1/yellow2.theserverindia.com`, so
the zone — including those Google MX records — lives in theserverindia's panel,
not in GoDaddy. Logging into GoDaddy and changing records there will do nothing
until the nameservers are moved, and moving the nameservers moves the whole zone.

## The safe path

Get the theserverindia panel login (the client has asked the previous designer
for it) and change **only the A record** to point at the new host. Leave the
nameservers and every other record alone. Mail is untouched because MX never
moves.

## The risky path, if it has to be taken

If the nameservers are ever repointed to Route 53 or GoDaddy, every record below
must be recreated in the new zone *before* the switch, or Google Workspace mail
stops and the Search Console verifications break:

```
MX   1  smtp.google.com

TXT  v=spf1 a mx include:websitewelcome.com include:_spf.google.com
     include:Yellow.theserverindia.com ~all

TXT  google-site-verification=tx0Bc_a9v1k8qT6UHjQ716HZvDHpLwFt5VFYZjA0u3Y
TXT  google-site-verification=c8NaV2tMxsnJt69f5Wto3bILWNlsYcz1NMDpUcewLP4
```

Export the full zone from theserverindia first and diff it against the new one.
The list above is what a public DNS query can see; a zone export may hold more
(DKIM selectors under `_domainkey`, subdomains, mail autodiscover records) that
does not show up from outside.

Also note the SPF record includes `Yellow.theserverindia.com` and
`websitewelcome.com`. If mail is ever sent from the new host, SPF has to be
updated or it will fail authentication.

## Rollout

1. Lower the A record TTL a day ahead, so a rollback is minutes rather than hours
2. Change the A record only
3. Keep the old hosting paid and running for 2–3 weeks — propagation is uneven
4. Send and receive a test mail on `info@quadishotels.com` immediately after,
   then again the next day
