// @ts-nocheck
import "../styles/globals.css"
import type { AppProps } from "next/app"
import { SessionProvider } from "next-auth/react"
import { IntlProvider } from "react-intl"

import messagesInFrench from "../compiled-lang/fr.json"

export default function App({
  Component,
  pageProps: { session, ...pageProps },
}) {
  return (
    <IntlProvider messages={messagesInFrench} locale="fr" defaultLocale="en">
      <SessionProvider session={session}>
        <Component {...pageProps} />
      </SessionProvider>
    </IntlProvider>
  )
}
