// @ts-nocheck
import Head from 'next/head'
import Image from 'next/image'
import styles from '../styles/Home.module.css'

import { useEffect, useState } from "react"

import { addMastodonHandles } from "../lib/twitter.ts"

export default function Home() {
  const [twitterHandle, setTwitterHandle] = useState('1h0ma5')
  const [twitterInfo, setTwitterInfo] = useState()
  const [following, setFollowing] = useState()
  const [mastodonId, setMastodonId] = useState()
  const [onMastodonFollowing, setOnMastodonFollowing] = useState()


  const fetchTwitterInfo = () => {
    fetch(`/api/twitter/details/${twitterHandle}`)
      .then(r => {
        return r.json()
      })
      .then(r => {
        const data = {...r, data: [r.data]}
        addMastodonHandles(data)
        setTwitterInfo(data)
      })
  }

  const fetchTwitterFollowing = () => {
    fetch(`/api/twitter/following/${twitterInfo.data[0].id}`)
      .then(r => {
        return r.json()
      })
      .then(r => {
        addMastodonHandles(r)
        setFollowing(r)
      })
  }

  const getAccount = (fullname) => {
    const comps = fullname.split('@')
    if (!comps[0].length) {
      comps.shift()
    }
    return {user: comps?.[0], host: comps?.[1]}
  }

  const fetchMastodon = async () => {
    const fullname = twitterInfo?.data[0].mastodonIds[0]
    const {user, host} = getAccount(fullname)
    setMastodonId({user, host})

    const response_l = await fetch(`https://${host}/api/v1/accounts/lookup?acct=${fullname}`)
    const json_l = await response_l.json()

    const response_f = await fetch(`https://${host}/api/v1/accounts/${json_l.id}/following?limit=1000`)
    const json_f = await response_f.json()

    const mastodonUserMap = json_f.reduce((a, v) => {
      const key = v.acct.includes('@') ? `@${v.acct}` : `@${v.acct}@${host}` 
      a[key] = v
      return a
    }, {})

    const followedMastodonUsers = following?.data?.filter(i => i.mastodonIds.length)
    followedMastodonUsers.forEach(u => {
      u.alreadyFollowedMastodonUser = mastodonUserMap[u.mastodonIds[0]]
    })

    setOnMastodonFollowing(followedMastodonUsers)
  }

  const generateCSV = () => {
    const dd = onMastodonFollowing.reduce((a, v) => {
      v.mastodonIds.forEach(i => {
        const {host} = getAccount(i)
        a[host] = a[host] || []
        a[host].push(i)
      })
      return a
    }, {})

    const toF = onMastodonFollowing?.filter(i => !i.alreadyFollowedMastodonUser)
    const accounts = toF.map(i => {
      const {user, host} = getAccount(i.mastodonIds[0])
      return `${user}@${host}`  
    })
    const rows = accounts.map(i => `${i},true`)
    const file = new File([
      [
        'Account address,Show boosts',
        ...rows
      ].join('\n')
        ], 'peopleToFollowOnMastodon.csv', {
      type: 'text/plain',
    })
    const link = document.createElement('a')
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
        <h1 className={styles.title}>
          Leave Twitter peacefully!
        </h1>

        <h2>1. Give us your Twitter handle</h2>
        <div>
          <label htmlFor="twitter-handle">Twitter handle</label>
          <input id="twitter-handle" value={twitterHandle} onChange={e => setTwitterHandle(e.target.value)} />
          <button onClick={fetchTwitterInfo}>Get id</button>
        </div>

        

        { twitterInfo && (
          <>
            <div>
            We found you on Twitter, your name is: &quot;{twitterInfo?.data?.[0]?.name}&quot;.
            </div>
            <div>
              {
                twitterInfo?.data[0].mastodonIds?.length ?
                  `We managed to extract your Mastodon account: "${twitterInfo?.data[0].mastodonIds[0]}".` :
                  `We didn't managed a Mastodon account from your public data.`  
              }
            </div>
           </>
           )
        }

        <h2>2. Follow people that are already on Mastodon</h2>

        { twitterInfo && (
          <>
            <button onClick={fetchTwitterFollowing}>Get following</button>

            { following && (<>

              <div>
                You follow {following?.data?.length} persons on Twitter and it
                looks like {following?.data?.filter(i => i.mastodonIds.length).length} are
                already on Mastodon.
              </div>

              {twitterInfo?.data[0].mastodonIds?.length && (<>
                  <button onClick={fetchMastodon}>Get already following on Mastodon with {twitterInfo?.data[0].mastodonIds[0]}</button>
                  You already follow {onMastodonFollowing?.filter(i => i.alreadyFollowedMastodonUser).length} but
                  you are missing {onMastodonFollowing?.filter(i => !i.alreadyFollowedMastodonUser).length} accounts.

                  <button onClick={generateCSV}>Generate the file to import on Mastodon</button>
                  <p>Now you can <a target="_blank" rel="noreferrer" href={`https://${mastodonId?.host}/settings/import`}>import and follow those accounts, all at once, here</a>.</p>
                </>
                )}

             </>
            )}
          </>
          )}

        <h2>3. Tell us how you want us to help you follow people that will move on Mastodon later!</h2>

        <button disabled>Send me a message on Mastodon when an account I should follow is created</button>

        <button disabled>Log me in on Mastodon to automatically follow new accounts</button>

      </main>

      <footer className={styles.footer}>
        <a
          href="https://vercel.com?utm_source=create-next-app&utm_medium=default-template&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          Powered by{' '}
          <span className={styles.logo}>
            <Image src="/vercel.svg" alt="Vercel Logo" width={72} height={16} />
          </span>
        </a>
      </footer>
    </div>
  )
}
