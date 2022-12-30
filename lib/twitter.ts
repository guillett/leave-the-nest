// @ts-nocheck

import { getAccount } from "../lib/mastodon.ts"

const url = (field: string) => {
  const urls = field ? field.match(/htt?tps:\/\/[\w\.\/@_0-9]+/g) || [] : []
  return urls
    .map((u) => {
      var groups = u.match(
        /\/\/(?<host>[\w\.]+)\/@(?<username>[\w\.]+)/
      )?.groups
      if (groups) {
        return `${groups.username}@${groups.host}`
      }
    })
    .filter((id) => id)
}

const direct = (field: string) =>
  field ? field.match(/[A-Za-zÀ-ÖØ-öø-ÿ_0-9]+@[\w\.]+/g) || [] : []

const f = (field: string) => [].concat(...direct(field), ...url(field))

export function addMastodonHandles(twitterData: any) {
  const found = []
  const pre = {}
  if (twitterData?.includes) {
    Object.keys(twitterData?.includes).forEach((type) => {
      pre[type] = {}
      const items = twitterData.includes[type]
      items.forEach((i) => {
        pre[type][i.id] = i
        i.mastodonIds = [].concat(
          ...f(i.text),
          ...(i?.entities?.urls?.map?.((u) => [].concat(f(u.title))) || [])
        )
        found.push(...i.mastodonIds)
      })
    })
  }
  twitterData.data.forEach((i) => {
    var entityIds = []
    if (i.entities) {
      Object.values(i.entities).forEach((v) => {
        v.urls?.forEach?.((u) => {
          entityIds.push(...f(u.expanded_url))
        })
      })
    }

    i.mastodonIds = []
      .concat(
        ...f(i.name),
        ...f(i.description),
        ...(i.pinned_tweet_id
          ? pre?.tweets?.[i.pinned_tweet_id]?.mastodonIds || []
          : []),
        ...[]
      )
      .map((id) => {
        const { acct } = getAccount(id)
        return acct
      })
    found.push(...i.mastodonIds)
  })
  return found
}
