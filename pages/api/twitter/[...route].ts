// @ts-nocheck
import fs from 'fs'
import type { NextApiRequest, NextApiResponse } from 'next'

import clientPromise from "../../../lib/mongodb.ts"


type Data = {
  name: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  const db = (await clientPromise).db()
  switch (req.query.route?.[0]) {
    case 'details': {
      const name = req.query.route?.[1]
      /*
      const content = fs.readFileSync(`d_${name}.json`, 'utf-8')
      return res.status(200).json(JSON.parse(content))//*/

      const search = new URLSearchParams()
      search.set("user.fields", "id,description,public_metrics,location,username,url,name,created_at,pinned_tweet_id,entities")
      search.set("expansions", "pinned_tweet_id")
      search.set("tweet.fields", "context_annotations,entities,geo")
      return fetch(`https://api.twitter.com/2/users/by/username/${name}?${search}`,
      {
        headers: {
          authorization: `bearer ${process.env.TWITTER_BEARER}`
        }
      })
      .then(r => {
        return r.json()
      })
      .then(async r => {
        const d = new Date()
        await db.collection('twitter_lookups').updateOne(
          {_id: r.data.id},
          {
              $set: {_id: r.data.id, data: r, updatedAt: d},
              $inc: {count: 1},
              $setOnInsert: {createdAt:d},
          }, { upsert: true})
        return res.status(200).json(r)
      })
      .catch(e => {
        console.log('err', e)
        return res.status(500).json(e)
      })
    }
  case 'following': {
      const twitterId = req.query.route?.[1]

      const search = new URLSearchParams()
      search.set("max_results", 1000)
      search.set("user.fields", "id,description,public_metrics,location,username,url,name,created_at,pinned_tweet_id,entities")
      search.set("expansions", "pinned_tweet_id")
      search.set("tweet.fields", "context_annotations,entities,geo,id")
      return fetch(`https://api.twitter.com/2/users/${twitterId}/following?${search}`,
      {
        headers: {
          authorization: `bearer ${process.env.TWITTER_BEARER}`
        }
      })
      .then(r => {
        return r.json()
      })
      .then(async r => {
        const d = new Date()
        await db.collection('twitter_followings').updateOne(
          {_id: twitterId},
          {
              $set: {_id: twitterId, data: r, updatedAt: d},
              $inc: {count: 1},
              $setOnInsert: {createdAt:d},
          }, { upsert: true})
        return res.status(200).json(r)
      })
      .catch(e => {
        console.log('err', e)
        return res.status(500).json(e)
      })
    }
  }
}
