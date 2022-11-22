// @ts-nocheck
import Head from "next/head"

import { useEffect, useState } from "react"
import linkParser from "parse-link-header"

import { addMastodonHandles } from "../lib/twitter.ts"

export default function Home() {
  const [twitterHandle, setTwitterHandle] = useState("1h0ma5")
  const [twitterInfo, setTwitterInfo] = useState()
  const [following, setFollowing] = useState()
  const [mastodonHandle, setMastodonHandle] = useState("")
  const [mastodonId, setMastodonId] = useState()
  const [onMastodonFollowing, setOnMastodonFollowing] = useState()
  const [explicitFollowList, setExplicitFollowList] = useState()

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

    const todo = [
      [
        `https://${mastodonId.host}/api/v1/accounts/${json_l.id}/following?limit=1000`,
        ["prev", "next"],
      ],
    ]
    const results = []
    while (todo.length) {
      const [uri, directions] = todo.shift()
      const response_f = await fetch(uri)
      const links = linkParser(response_f.headers.get("link"))
      directions.forEach((d) => {
        if (links?.[d]) {
          todo.push([links[d].url, [d]])
        }
      })
      const json_f = await response_f.json()
      results.push(json_f)
    }

    const fullResult = [].concat(...results)

    const mastodonUserMap = fullResult.reduce((a, v) => {
      const key = v.acct.includes("@")
        ? `@${v.acct}`
        : `@${v.acct}@${mastodonId.host}`
      a[key.toLowerCase()] = v
      return a
    }, {})

    const followedMastodonUsers = following?.data?.filter(
      (i) => i.mastodonIds.length
    )
    followedMastodonUsers.forEach((u) => {
      u.alreadyFollowedMastodonUser =
        mastodonUserMap[
          u.mastodonIds
            .find((i) => i && mastodonUserMap[i?.toLowerCase?.()])
            ?.toLowerCase?.()
        ]
    })

    setOnMastodonFollowing(followedMastodonUsers)
  }

  const generateCSV = (list) => {
    const accounts = list.map((i) => {
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

  const generateExplicitFollowList = () => {
    setExplicitFollowList(
      onMastodonFollowing
        ?.filter((i) => !i.alreadyFollowedMastodonUser)
        .map((e) => {
          return {
            ...e,
            checked: true,
          }
        })
    )
  }

  const updateCheck = (idx, old) => {
    const newList = [...explicitFollowList]
    newList[idx].checked = !old
    setExplicitFollowList(newList)
  }

  return (
    <div>
      <Head>
        <title>Leave the nest</title>
        <meta name="description" content="Leave Twitter peacefully" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main>
        <h1>Leave Twitter peacefully!</h1>

        <h2>1. Give us your Twitter handle</h2>

        <label htmlFor="twitter-handle">What is your Twitter handle?</label>
        <input
          type="text"
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
            <div className="section">
              <button onClick={fetchTwitterFollowing}>
                Get the list of people you follow on Twitter
              </button>

              {following && (
                <div>
                  You follow {following?.data?.length} persons on Twitter and it
                  looks like{" "}
                  {following?.data?.filter((i) => i.mastodonIds.length).length}{" "}
                  are already on Mastodon.
                </div>
              )}
            </div>
            {following && (
              <>
                {mastodonId ? (
                  <>
                    <div className="section">
                      <button onClick={() => fetchMastodon(mastodonId)}>
                        Get the list of people you already follow on Mastodon
                        with {mastodonId.acct}
                      </button>
                      {onMastodonFollowing && (
                        <div>
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
                        </div>
                      )}
                    </div>

                    {onMastodonFollowing && (
                      <>
                        <button
                          className="section"
                          onClick={() =>
                            generateCSV(
                              onMastodonFollowing?.filter(
                                (i) => !i.alreadyFollowedMastodonUser
                              )
                            )
                          }
                        >
                          Generate the file to import on Mastodon
                        </button>
                        <button
                          className="section"
                          onClick={generateExplicitFollowList}
                        >
                          Show the list of people to follow on Mastodon
                        </button>

                        {explicitFollowList && (
                          <>
                            <div>
                              Uncheck people to remove them from the generated
                              CSV.
                            </div>
                            <fieldset>
                              <legend>Twitter people on Mastodon</legend>
                              {explicitFollowList.map((e, idx) => (
                                <>
                                  <div key={e.username}>
                                    <input
                                      type="checkbox"
                                      id={`checkbox_${e.username}`}
                                      checked={e.checked}
                                      onChange={() =>
                                        updateCheck(idx, e.checked)
                                      }
                                    />
                                    <label htmlFor={`checkbox_${e.username}`}>
                                      <a
                                        target="_blank"
                                        rel="noreferrer"
                                        href={`https://twitter.com/${e.username}`}
                                      >
                                        {e.username}
                                      </a>
                                    </label>{" "}
                                    - {e.name} - {e.description}
                                  </div>
                                </>
                              ))}
                            </fieldset>
                            <button
                              className="section"
                              onClick={() => generateCSV(explicitFollowList)}
                            >
                              Generate the file to import these{" "}
                              {
                                explicitFollowList.filter((e) => e.checked)
                                  .length
                              }{" "}
                              people on Mastodon
                            </button>
                          </>
                        )}

                        <div>
                          <div>
                            Now you can{" "}
                            <a
                              target="_blank"
                              rel="noreferrer"
                              href={`https://${mastodonId.host}/settings/import`}
                            >
                              import and follow those accounts, all at once,
                              here
                            </a>
                            .
                          </div>
                          <div>
                            Beware, the import process can{" "}
                            <strong>take some time</strong> on your Mastodon
                            instance.
                          </div>
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <div className="section">
                    <div>
                      You should add your @user@instance.social in your Twitter
                      bio or username to help people find you on Mastodon.
                    </div>
                    <div>
                      <label htmlFor="mastodon-handle">
                        What is your Mastodon handle?
                      </label>
                    </div>
                    <div>
                      <input
                        type="text"
                        id="mastodon-handle"
                        value={mastodonHandle}
                        onChange={(e) => setMastodonHandle(e.target.value)}
                      />
                    </div>
                    <div>
                      <button onClick={explicitMastodonHandle}>
                        Get the list of people you already follow on Mastodon
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}

        <h2>
          3. Tell us how you want us to help you follow people that will move on
          Mastodon later!
        </h2>
        {onMastodonFollowing && (
          <>
            <button disabled className="section">
              Send me a message on Mastodon when an account I should follow is
              created
            </button>

            <button disabled className="section">
              Log me in on Mastodon to automatically follow new accounts
            </button>
          </>
        )}
      </main>

      <footer></footer>
    </div>
  )
}
