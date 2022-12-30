// @ts-nocheck
import * as bluebird from "bluebird"
import Head from "next/head"

import { getAccount } from "../lib/mastodon.ts"
import { addMastodonHandles } from "../lib/twitter.ts"

import fullDataset from "../lookups.json"

export default function Home() {
  const im = ["SergeBossini", "albanlombard", "Loi_1901", "834u_P177"]
  const data = fullDataset.filter((e) =>
    im.some((i) => e.data.data.username.includes(i))
  )

  return (
    <div>
      <Head>
        <title>Leave the nest</title>
        <meta name="description" content="Leave Twitter peacefully" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main>
        {data.map((d) => (
          <div key={d._id}>
            {d.data.data.username}
            <pre>
              {JSON.stringify(
                addMastodonHandles({
                  ...d.data,
                  data: [d.data.data],
                }) /*.map(e => getAccount(e))*/,
                null,
                2
              )}
            </pre>
            <pre>{JSON.stringify(d, null, 2)}</pre>
          </div>
        ))}
      </main>
    </div>
  )
}
