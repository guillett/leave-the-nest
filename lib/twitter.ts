// @ts-nocheck

import { getAccount } from "../lib/mastodon.ts"

const f = (field: string) =>
  field ? field.match(/(?<n>@?[A-Za-zÀ-ÖØ-öø-ÿ_0-9]+@[\w\.]+)/g) || [] : []

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
          ...f(i.text) /*,
					...(i?.entities?.urls?.map?.(u => [].concat(
						f(u.title)
						)))//*/
        )
        found.push(...i.mastodonIds)
      })
    })
  }
  twitterData.data.forEach((i) => {
    i.mastodonIds = []
      .concat(
        ...f(i.name),
        ...f(i.description)
        //...(i.pinned_tweet_id ? pre?.tweets[i.pinned_tweet_id]?.mastodonIds : []),
      )
      .map((id) => {
        const { acct } = getAccount(id)
        return acct
      })
    found.push(...i.mastodonIds)
  })
  return found
}
