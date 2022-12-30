// @ts-nocheck
import type { NextApiRequest, NextApiResponse } from "next"

//https://mamot.fr/api/v1/accounts/relationships

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  return fetch("https://mamot.fr/api/v1/statuses", {
    method: "post",
    headers: {
      authorization: `bearer ${process.env.MASTODON_SOCIAL_TOKEN}`,
    },
    body: JSON.stringify({
      status: "Test",
      visibility: "direct",
    }),
  })
    .then((r) => r.json())
    .catch((error) => {
      res.json({ error })
    })
}
