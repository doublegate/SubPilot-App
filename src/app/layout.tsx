import "@/styles/globals.css"
import { Inter } from "next/font/google"
import { type Metadata } from "next"

import { TRPCReactProvider } from "@/trpc/react"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
})

export const metadata: Metadata = {
  title: {
    default: "SubPilot - Track Your Subscriptions",
    template: "%s | SubPilot",
  },
  description: "Your command center for recurring finances. Monitor, manage, and cancel subscriptions automatically.",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable}`}>
      <body className="font-sans">
        <TRPCReactProvider>
          {children}
        </TRPCReactProvider>
      </body>
    </html>
  )
}