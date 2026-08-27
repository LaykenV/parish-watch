# Public Parish apex redirect

## Why this exists

Convex asked for a literal CNAME from the public host to `convex.domains`.
Vercel DNS does not permit a CNAME at the bare domain because an apex CNAME
conflicts with the domain's required DNS records. Vercel's apex ALIAS resolved
to the correct Convex addresses, but Convex did not verify that record shape.

The working arrangement is therefore:

```text
publicparish.com
  -> permanent Vercel redirect
  -> www.publicparish.com
  -> Convex custom domain
  -> the same production release as befitting-flamingo-587.convex.site
```

DNS cannot issue an HTTP redirect by itself. The small Vercel project is the
HTTP endpoint that returns the permanent redirect while preserving the path and
query string. This directory is its complete source.

`vercel.json` contains the redirect behavior. `index.html` gives the project a
deployable static file, but the wildcard redirect runs before that file and no
visitor should see it.

## Hackathon compliance

The [Convex All Gas Hackathon](https://www.convex.dev/hackathons/all-gas)
requires a public `convex.site` or `chatgpt.site` URL that judges and agents can
open without an invitation. Public Parish keeps
`https://befitting-flamingo-587.convex.site` live and uses that URL for the
submission. The custom domain is an additional public entry point, not a
replacement for the required host.

Vercel does not build or serve the Public Parish application. It handles only
the bare-domain redirect. Convex serves the frontend at both
`https://www.publicparish.com` and the qualifying `convex.site` URL, and the
application uses the same Convex production backend from either origin. This
keeps the required public host and Convex stack intact.

The official rules do not prohibit an additional custom domain. We do not rely
on that silence for qualification. The public `convex.site` deployment directly
satisfies the stated hosting and submission requirement.

## Deployment

Deploy this directory only when its redirect configuration changes:

```bash
cd infra/apex-redirect
npx vercel deploy --prod --yes \
  --project public-parish-redirect \
  --scope laykenvs-projects
```
