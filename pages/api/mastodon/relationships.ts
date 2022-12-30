// @ts-nocheck
import type { NextApiRequest, NextApiResponse } from "next"

//https://mamot.fr/api/v1/accounts/relationships

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const o = new URLSearchParams()
  req.query["id[]"].forEach((i) => {
    o.append("id[]", i)
  })

  return fetch(
    "https://mamot.fr/api/v1/accounts/relationships?" + o.toString(),
    {
      //return fetch("https://mamot.fr/api/v1/accounts/50669/following",
      //return fetch("https://mamot.fr/api/v1/accounts/41699/follow", {
      //return fetch("https://mamot.fr/api/v1/follow_requests", {
      //method: 'post',
      headers: {
        authorization: `bearer ${process.env.MAMOT_TOKEN}`,
      },
    }
  )
    .then((r) => r.json())
    .then((r) => res.json(r))
    .catch((error) => {
      res.json({ error })
    })
}
