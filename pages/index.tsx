// @ts-nocheck
import Head from "next/head"
import Image from "next/image"
import styles from "../styles/Home.module.css"

import { useEffect, useState } from "react"

import { addMastodonHandles } from "../lib/twitter.ts"

export default function Home() {
  const [twitterHandle, setTwitterHandle] = useState("1h0ma5")
  const [twitterInfo, setTwitterInfo] = useState()
  const [following, setFollowing] = useState()
  const [mastodonHandle, setMastodonHandle] = useState("")
  const [mastodonId, setMastodonId] = useState()
  const [onMastodonFollowing, setOnMastodonFollowing] = useState()

  const getAccount = (fullname) => {
    const comps = fullname.split("@")
    if (!comps[0].length) {
      comps.shift()
    }
    return {
      user: comps?.[0],
      host: comps?.[1],
      acct: `${comps?.[0]}@${comps?.[1]}`,
    }
  }

  const fetchTwitterInfo = () => {
    fetch(`/api/twitter/details/${twitterHandle}`)
      .then((r) => {
        return r.json()
      })
      .then((r) => {
        const data = { ...r, data: [r.data] }
        addMastodonHandles(data)
        setTwitterInfo(data)

        const fullname = data.data[0].mastodonIds?.[0]
        if (fullname) {
          setMastodonId(getAccount(fullname))
        } else {
          setMastodonId()
        }
      })
  }

  const fetchTwitterFollowing = () => {
    fetch(`/api/twitter/following/${twitterInfo.data[0].id}`)
      .then((r) => {
        return r.json()
      })
      .then((r) => {
        const allHandles = addMastodonHandles(r)
        // check domains

        const domains = allHandles.map((h) => getAccount(h)?.host)
        const domainMap = domains.reduce((a, v) => {
          a[v] = 1 + (a[v] || 0)
          return a
        }, {})
        fetch("/api/mastodon/instances", {
          method: "post",
          body: JSON.stringify(Object.keys(domainMap)),
        })
          .then((r) => r.json())
          .then((domainData) => {
            r.data.forEach((item) => {
              item.mastodonIds = item.mastodonIds.filter((id) => {
                const { host } = getAccount(id)
                return domainData[host]
              })
            })
            setFollowing(r)
          })
      })
  }

  const explicitMastodonHandle = () => {
    const acct = getAccount(mastodonHandle)
    setMastodonId(acct)
    fetchMastodon(acct)
  }

  const fetchMastodon = async (mastodonId) => {
    const response_l = await fetch(
      `https://${mastodonId.host}/api/v1/accounts/lookup?acct=${mastodonId.acct}`
    )
    const json_l = await response_l.json()

    const response_f = await fetch(
      `https://${mastodonId.host}/api/v1/accounts/${json_l.id}/following?limit=1000`
    )
    const json_f = await response_f.json()

    const mastodonUserMap = json_f.reduce((a, v) => {
      const key = v.acct.includes("@")
        ? `@${v.acct}`
        : `@${v.acct}@${mastodonId.host}`
      a[key] = v
      return a
    }, {})

    const followedMastodonUsers = following?.data?.filter(
      (i) => i.mastodonIds.length
    )
    followedMastodonUsers.forEach((u) => {
      u.alreadyFollowedMastodonUser = mastodonUserMap[u.mastodonIds[0]]
    })

    setOnMastodonFollowing(followedMastodonUsers)
  }

  const generateCSV = () => {
    const dd = onMastodonFollowing.reduce((a, v) => {
      v.mastodonIds.forEach((i) => {
        const { host } = getAccount(i)
        a[host] = a[host] || []
        a[host].push(i)
      })
      return a
    }, {})

    const toF = onMastodonFollowing?.filter(
      (i) => !i.alreadyFollowedMastodonUser
    )
    const accounts = toF.map((i) => {
      const { acct } = getAccount(i.mastodonIds[0])
      return acct
    })
    const rows = accounts.map((i) => `${i},true`)
    const file = new File(
      [["Account address,Show boosts", ...rows].join("\n")],
      "peopleToFollowOnMastodon.csv",
      {
        type: "text/plain",
      }
    )
    const link = document.createElement("a")
    const url = URL.createObjectURL(file)

    link.href = url
    link.download = file.name
    document.body.appendChild(link)
    link.click()

    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className={styles.container}>
      <Head>
        <title>Leave the nest</title>
        <meta name="description" content="Leave Twitter peacefully" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <h1 className={styles.title}>Leave Twitter peacefully!</h1>

        <h2>1. Give us your Twitter handle</h2>

        <label htmlFor="twitter-handle">What is your Twitter handle?</label>
        <input
          id="twitter-handle"
          value={twitterHandle}
          onKeyPress={(e) => {
            if (e.charCode == 13) {
              fetchTwitterInfo()
            }
          }}
          onChange={(e) => setTwitterHandle(e.target.value)}
        />
        <button onClick={fetchTwitterInfo}>Get your info on Twitter</button>

        {twitterInfo && (
          <>
            <div>
              We found you on Twitter, your name is: &quot;
              {twitterInfo?.data?.[0]?.name}&quot;
            </div>
            <div>
              {mastodonId && !mastodonHandle.length
                ? `We managed to extract your Mastodon account: "${mastodonId.acct}"`
                : `We didn't managed a Mastodon account from your public data.`}
            </div>
          </>
        )}

        <h2>2. Follow people that are already on Mastodon</h2>

        {twitterInfo && (
          <>
            <button onClick={fetchTwitterFollowing}>
              Get the list of people you follow on Twitter
            </button>

            {following && (
              <>
                <div>
                  You follow {following?.data?.length} persons on Twitter and it
                  looks like{" "}
                  {following?.data?.filter((i) => i.mastodonIds.length).length}{" "}
                  are already on Mastodon.
                </div>

                {mastodonId ? (
                  <>
                    <button onClick={() => fetchMastodon(mastodonId)}>
                      Get the list of people you already follow on Mastodon with{" "}
                      {mastodonId.acct}
                    </button>
                    {onMastodonFollowing && (
                      <>
                        You already follow{" "}
                        {
                          onMastodonFollowing?.filter(
                            (i) => i.alreadyFollowedMastodonUser
                          ).length
                        }{" "}
                        accounts but you are missing{" "}
                        {
                          onMastodonFollowing?.filter(
                            (i) => !i.alreadyFollowedMastodonUser
                          ).length
                        }
                        .
                        <button onClick={generateCSV}>
                          Generate the file to import on Mastodon
                        </button>
                        <div>
                          Now you can{" "}
                          <a
                            target="_blank"
                            rel="noreferrer"
                            href={`https://${mastodonId.host}/settings/import`}
                          >
                            import and follow those accounts, all at once, here
                          </a>
                          .
                          <br />
                          Beware, the import process can{" "}
                          <strong>take some time</strong> on your Mastodon
                          instance.
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    You should add your @user@instance.social in your Twitter
                    bio or username to help people find you on Mastodon.
                    <label htmlFor="mastodon-handle">
                      What is your Mastodon handle?
                    </label>
                    <input
                      id="mastodon-handle"
                      value={mastodonHandle}
                      onChange={(e) => setMastodonHandle(e.target.value)}
                    />
                    <button onClick={explicitMastodonHandle}>
                      Get the list of people you already follow on Mastodon
                    </button>
                  </>
                )}
              </>
            )}
          </>
        )}

        <h2>
          3. Tell us how you want us to help you follow people that will move on
          Mastodon later!
        </h2>

        <button disabled>
          Send me a message on Mastodon when an account I should follow is
          created
        </button>

        <button disabled>
          Log me in on Mastodon to automatically follow new accounts
        </button>
      </main>

      <footer className={styles.footer}>
        <a
          href="https://vercel.com?utm_source=create-next-app&utm_medium=default-template&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          Powered by{" "}
          <span className={styles.logo}>
            <Image src="/vercel.svg" alt="Vercel Logo" width={72} height={16} />
          </span>
        </a>
      </footer>
    </div>
  )
}
