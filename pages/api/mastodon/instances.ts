// @ts-nocheck
import type { NextApiRequest, NextApiResponse } from "next"

import * as bluebird from "bluebird"

import clientPromise from "../../../lib/mongodb.ts"
import { timeout } from "../../../lib/timeout.ts"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  const domains = JSON.parse(req.body)
  const db = (await clientPromise).db()

  const domainMap = {}
  const cursor = await db.collection("mastodon_host_checks").find()
  await cursor.forEach((v) => {
    domainMap[v._id] = v
  })

  const domainsToCheck = domains.filter((d) => !domainMap[d])
  return bluebird
    .map(
      domainsToCheck,
      (host) => {
        return timeout(5000, fetch(`https://${host}/.well-known/host-meta`))
          .then((r) => {
            return r.text()
          })
          .then((r) => {
            return r.length > 0 && r.includes("webfinger")
          })
          .catch((e) => {
            return false
          })
          .then(async (result) => {
            await db.collection("mastodon_host_checks").updateOne(
              { _id: host },
              {
                $set: { _id: host, result },
                $setOnInsert: { createdAt: new Date() },
              },
              { upsert: true }
            )
            domainMap[host] = result

            return { host, result }
          })
      },
      { concurrency: 3 }
    )
    .then((r) => {
      return res.status(200).json(
        JSON.parse(req.body).reduce((a, v) => {
          a[v] = domainMap[v].result
          return a
        }, {})
      )
    })
}
