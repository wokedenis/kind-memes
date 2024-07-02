import { ExternalLink } from '@/components/external-link'

export function EmptyScreen() {
  return (
    <div className="mx-auto max-w-2xl px-4">
      <div className="flex flex-col gap-2 rounded-lg border bg-background p-8">
        <h1 className="text-lg font-semibold">Welcome to Kind Memes! 🤍</h1>
        <p className="leading-normal text-muted-foreground">
          This is created using an open source AI chatbot app template built with{' '}
          <ExternalLink href="https://nextjs.org">Next.js</ExternalLink>,
          the <ExternalLink href="https://sdk.vercel.ai">Vercel AI SDK</ExternalLink>,
          and <ExternalLink href="https://vercel.com/storage/kv">Vercel KV</ExternalLink>.
        </p>
        <p className="leading-normal text-muted-foreground">
          Currently it&apos;s also very buggy. If you see something weird, feel free to let me know at{' '}
          <ExternalLink href="https://t.me/deniskasan">Telegram</ExternalLink> or{' '}
          <ExternalLink href="https://instagram.com/denisadhd">Instagram</ExternalLink>.
          And I&apos;d be a very happy creator if you dropped a follow on my{' '}
          <ExternalLink href="https://t.me/denisadhd">Telegram Channel</ExternalLink> 🌸
        </p>
      </div>
    </div>
  )
}
