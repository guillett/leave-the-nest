// @ts-nocheck
import * as bluebird from "bluebird"
import Head from "next/head"
import { signIn, signOut } from "next-auth/react"
import linkParser from "parse-link-header"
import { useEffect, useState } from "react"
import { FormattedMessage } from "react-intl"

import { getAccount } from "../lib/mastodon.ts"
import { addMastodonHandles } from "../lib/twitter.ts"
import { timeout } from "../lib/timeout.ts"

export default function Home() {
  const [twitterHandle, setTwitterHandle] = useState("1h0ma5")
  const [twitterInfo, setTwitterInfo] = useState()
  const [following, setFollowing] = useState()
  const [mastodonHandle, setMastodonHandle] = useState("")
  const [mastodonId, setMastodonId] = useState()
  const [onMastodonFollowing, setOnMastodonFollowing] = useState()
  const [explicitFollowList, setExplicitFollowList] = useState()

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

  const test = () => {
    const d = new FormData()

    d.set("status", "test2 @guillett@mamot.fr")
    d.set("visibility", "direct")
    return fetch("https://mapstodon.space/api/v1/statuses", {
      //    return fetch("https://mamot.fr/api/v1/statuses", {
      method: "post",
      headers: {
        //        authorization: `bearer ${process.env.BEARER_2}`,
        //        authorization: `bearer ${process.env.MAMOT_TOKEN}`,
        //        authorization: `bearer ${process.env.BEARER_1}`,
        //        authorization: `bearer ${process.env.MASTODON_SOCIAL_TOKEN}`
      },
      body: d,
    })
      .then((r) => r.json())
      .catch((error) => {
        res.json({ error })
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
      const key = v.acct.includes("@") ? v.acct : `${v.acct}@${mastodonId.host}`
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
    const list = onMastodonFollowing
      ?.filter((i) => !i.alreadyFollowedMastodonUser)
      .map((e) => {
        return {
          ...e,
          checked: true,
        }
      })
    setExplicitFollowList(list)
  }

  const updateCheck = (idx, old) => {
    const newList = [...explicitFollowList]
    newList[idx].checked = !old
    setExplicitFollowList(newList)
  }

  const MastodonLink = ({ data }) => {
    const mastodon = getAccount(data.mastodonIds[0])
    return (
      <a
        target="_blank"
        rel="noreferrer"
        href={`https://${mastodon.host}/@${mastodon.user}`}
      >
        {mastodon.acct}
      </a>
    )
  }

  const getData = () => {
    bluebird
      .map(
        false ? explicitFollowList : [],
        (user) => {
          const url = `https://${mastodonId.host}/api/v1/accounts/lookup?acct=@${user.mastodonIds[0]}`
          return timeout(3000, fetch(url))
            .then((r) => r.json())
            .catch((error) => {
              console.log("error", error)
              return { error: error.toString() }
            })
            .then((result) => {
              return {
                result,
                user,
              }
            })
        },
        { concurrency: 3 }
      )
      .then((results) => {
        const bogus = results.filter((i) => !i.result.id)
        console.log("bogus", bogus)
        const found = results.filter((i) => i.result.id)
        console.log("found", found)

        const o = new URLSearchParams()
        found.forEach((i) => {
          o.append("id[]", i.result.id)
        })

        const ids = "id[]=41699&id[]=109207644661915522&id[]=170&id[]=1866"
        //const ids = o.toString()

        fetch("/api/mastodon/relationships?" + ids)
          .then((r) => r.json())
          .then((r) => {
            console.log(r)
          })
      })
  }

  return (
    <div>
      <Head>
        <title>Leave the nest</title>
        <meta name="description" content="Leave Twitter peacefully" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main>
        <h1>
          <FormattedMessage
            id="title"
            defaultMessage="Leave Twitter peacefully!"
          />
        </h1>
        <h2>
          <FormattedMessage
            id="step1"
            defaultMessage="1. Give us your Twitter handle"
          />
        </h2>

        <label htmlFor="twitter-handle">
          <FormattedMessage
            id="twitter-handle-question"
            defaultMessage="What is your Twitter handle?"
          />
        </label>
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
        <button onClick={fetchTwitterInfo}>
          <FormattedMessage
            id="twitter-handle-cta"
            defaultMessage="Get your info on Twitter"
          />
        </button>

        {twitterInfo && (
          <>
            <div>
              <FormattedMessage
                id="twitter-name"
                defaultMessage="We found you on Twitter, your name is: ''{name}''"
                values={{ name: twitterInfo?.data?.[0]?.name }}
              />
            </div>
            <div>
              {mastodonId && !mastodonHandle.length ? (
                <FormattedMessage
                  id="twitter-mastodon-account"
                  defaultMessage="We managed to extract your Mastodon account: ''{acct}'"
                  values={{ acct: mastodonId.acct }}
                />
              ) : (
                <FormattedMessage
                  id="twitter-mastodon-account-not-found"
                  defaultMessage="We didn't managed a Mastodon account from your public data."
                />
              )}
            </div>
          </>
        )}

        <h2>
          <FormattedMessage
            id="step2"
            defaultMessage="2. Follow people that are already on Mastodon"
          />
        </h2>

        {twitterInfo && (
          <>
            <div className="section">
              <button onClick={fetchTwitterFollowing}>
                <FormattedMessage
                  id="twitter-following-cta"
                  defaultMessage="Get the list of people you follow on Twitter"
                />
              </button>

              {following && (
                <div>
                  <FormattedMessage
                    id="twitter-following-counts"
                    defaultMessage="You follow {total} persons on Twitter and it looks like {onMastodon} are already on Mastodon."
                    values={{
                      total: following?.data?.length,
                      onMastodon: following?.data?.filter(
                        (i) => i.mastodonIds.length
                      ).length,
                    }}
                  />
                </div>
              )}
            </div>
            {following && (
              <>
                {mastodonId ? (
                  <>
                    <div className="section">
                      <button onClick={() => fetchMastodon(mastodonId)}>
                        <FormattedMessage
                          id="mastodon-following-cta"
                          defaultMessage="Get the list of people you already follow on Mastodon with {acct}"
                          values={{ acct: mastodonId.acct }}
                        />
                      </button>
                      {onMastodonFollowing && (
                        <div>
                          <FormattedMessage
                            id="mastodon-following-counts"
                            defaultMessage="You already follow {total} accounts but you are missing {alreadyFollowed}."
                            values={{
                              total: onMastodonFollowing?.filter(
                                (i) => i.alreadyFollowedMastodonUser
                              ).length,
                              alreadyFollowed: onMastodonFollowing?.filter(
                                (i) => !i.alreadyFollowedMastodonUser
                              ).length,
                            }}
                          />
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
                          <FormattedMessage
                            id="csv-cta"
                            defaultMessage="Generate the file to import on Mastodon"
                          />
                        </button>
                        <button
                          className="section"
                          onClick={generateExplicitFollowList}
                        >
                          <FormattedMessage
                            id="show-list-cta"
                            defaultMessage="Show the list of people to follow on Mastodon"
                          />
                        </button>

                        {explicitFollowList && (
                          <>
                            <div>
                              <FormattedMessage
                                id="list-explanation"
                                defaultMessage="Uncheck people to remove them from the generated CSV."
                              />
                            </div>
                            <fieldset>
                              <legend>
                                <FormattedMessage
                                  id="list-title"
                                  defaultMessage="Twitter people on Mastodon"
                                />
                              </legend>
                              {explicitFollowList.map((e, idx) => (
                                <div key={e.username}>
                                  <input
                                    type="checkbox"
                                    id={`checkbox_${e.username}`}
                                    checked={e.checked}
                                    onChange={() => updateCheck(idx, e.checked)}
                                  />
                                  <label htmlFor={`checkbox_${e.username}`}>
                                    <a
                                      target="_blank"
                                      rel="noreferrer"
                                      href={`https://twitter.com/${e.username}`}
                                    >
                                      {e.username}@twitter.com
                                    </a>
                                    {" - "}
                                    <MastodonLink data={e} /> - {e.name} -{" "}
                                    {e.description}
                                  </label>
                                </div>
                              ))}
                            </fieldset>
                            <button
                              className="section"
                              onClick={() => generateCSV(explicitFollowList)}
                            >
                              <FormattedMessage
                                id="explicit-list-csv-cta"
                                defaultMessage="Generate the file to import these {count} people on Mastodon"
                                values={{
                                  count: explicitFollowList.filter(
                                    (e) => e.checked
                                  ).length,
                                }}
                              />
                            </button>
                          </>
                        )}

                        <div>
                          <div>
                            <FormattedMessage
                              id="csv-import-explanation"
                              defaultMessage="Now you can <a>import and follow those accounts, all at once, here</a>."
                              values={{
                                a: (chunks) => (
                                  <a
                                    target="_blank"
                                    rel="noreferrer"
                                    href={`https://${mastodonId.host}/settings/import`}
                                  >
                                    {chunks}
                                  </a>
                                ),
                              }}
                            />
                          </div>
                          <div>
                            <FormattedMessage
                              id="csv-import-warning"
                              defaultMessage="Beware, the import process can <strong>take some time</strong> on your Mastodon
                            instance."
                              values={{
                                strong: (chunks) => <strong>{chunks}</strong>,
                              }}
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <div className="section">
                    <div>
                      <FormattedMessage
                        id="mastodon-handle-comment"
                        defaultMessage="You should add your @user@instance.social in your Twitter bio or username to help people find you on Mastodon."
                      />
                    </div>
                    <div>
                      <label htmlFor="mastodon-handle">
                        <FormattedMessage
                          id="mastodon-handle-question"
                          defaultMessage="What is your Mastodon handle?"
                        />
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
                        <FormattedMessage
                          id="explicit-list-cta"
                          defaultMessage="Get the list of people you already follow on Mastodon"
                        />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}

        <h2>
          <FormattedMessage
            id="step3"
            defaultMessage="3. Tell us how you want us to help you follow people that will move on Mastodon later!"
          />
        </h2>
        {onMastodonFollowing && (
          <>
            <button disabled className="section">
              <FormattedMessage
                id="direct-message-cta"
                defaultMessage="Send me a message on Mastodon when an account I should follow is created"
              />
            </button>

            <button disabled className="section">
              <FormattedMessage
                id="application-cta"
                defaultMessage="Log me in on Mastodon to automatically follow new accounts"
              />
            </button>
          </>
        )}
      </main>

      <button onClick={() => test()}>test</button>
      <button onClick={() => signIn()}>signIn</button>
      <button onClick={() => signOut()}>signOut</button>
      <button onClick={() => getData()}>getData</button>

      <footer>
        <p>
          <FormattedMessage
            id="open-source-comment"
            defaultMessage="This service is <a>open-source</a>. Feel free to contribute and please let me <me>@guillett@mamot.fr</me> know if it is bogus."
            values={{
              a: (c) => (
                <a
                  target="_blank"
                  rel="noreferrer"
                  href="https://github.com/guillett/leave-the-nest"
                >
                  {c}
                </a>
              ),
              me: (c) =>
                mastodonId ? (
                  <a
                    target="_blank"
                    rel="noreferrer"
                    href={`https://${mastodonId.host}/@guillett@mamot.fr`}
                  >
                    {c}
                  </a>
                ) : (
                  <a
                    target="_blank"
                    rel="noreferrer"
                    href={`https://mamot.fr/@guillett`}
                  >
                    {c}
                  </a>
                ),
            }}
          />
        </p>
      </footer>
    </div>
  )
}
