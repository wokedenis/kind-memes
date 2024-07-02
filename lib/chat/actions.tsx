import 'server-only'

import {
  createAI,
  getMutableAIState,
  getAIState,
  streamUI,
  createStreamableValue
} from 'ai/rsc'
import { anthropic } from '@ai-sdk/anthropic';

import { nanoid } from '@/lib/utils'
import { saveChat } from '@/app/actions'
import { BotMessage, SpinnerMessage, UserMessage } from '@/components/ui/message'
import { Chat, Message } from '@/lib/types'
import { auth } from '@/auth'

const UNSPLASH_API_KEY = process.env.UNSPLASH_API_KEY

async function submitUserMessage(content: string) {
  'use server'

  const aiState = getMutableAIState<typeof AI>()

  aiState.update({
    ...aiState.get(),
    messages: [
      ...aiState.get().messages,
      {
        id: nanoid(),
        role: 'user',
        content
      }
    ]
  })

  let textStream: undefined | ReturnType<typeof createStreamableValue<string>>
  let textNode: undefined | React.ReactNode

  const result = await streamUI({
    model: anthropic('claude-3-haiku-20240307'),
    initial: <SpinnerMessage />,
    system: `\
    You are a helpful AI assistant. You can chat with users and answer their questions. You can also generate memes when asked. To generate a meme, respond with JSON in the format: {"type": "meme", "topText": "...", "bottomText": "...", "imagePrompt": "..."}`,
    messages: [
      ...aiState.get().messages.map((message: any) => ({
        role: message.role,
        content: message.content,
        name: message.name
      }))
    ],
    text: async ({ content, done, delta }) => {
      if (!textStream) {
        textStream = createStreamableValue<string>('')
        textNode = <BotMessage content={textStream.value} />
      }

      if (done) {
        textStream.done()
        try {
          const memeData = JSON.parse(content)
          if (memeData.type === 'meme') {
            const imageUrl = await generateMeme(memeData.imagePrompt)
            if (imageUrl) {
              textNode = (
                <BotMessage
                  content={`Here's your meme:`}
                  memeData={{
                    topText: memeData.topText,
                    bottomText: memeData.bottomText,
                    imageUrl
                  }}
                />
              )
            }
          }
        } catch (error) {
          // Not a valid JSON, treat as normal text
        }
        aiState.done({
          ...aiState.get(),
          messages: [
            ...aiState.get().messages,
            {
              id: nanoid(),
              role: 'assistant',
              content
            }
          ]
        })
      } else {
        textStream.update(delta)
      }
      return textNode
    },
    tools: {
      // Remove all stock-related tools
    }
  })

  return {
    id: nanoid(),
    display: result.value
  }
}

export type AIState = {
  chatId: string
  messages: Message[]
}

export type UIState = {
  id: string
  display: React.ReactNode
}[]

export const AI = createAI<AIState, UIState>({
  actions: {
    submitUserMessage
  },
  initialUIState: [],
  initialAIState: { chatId: nanoid(), messages: [] },
  onGetUIState: async () => {
    'use server'

    const session = await auth()

    if (session && session.user) {
      const aiState = getAIState()
      if (aiState) {
        const uiState = getUIStateFromAIState(aiState as Chat)
        return uiState
      }
    } else {
      return []
    }
  },
  onSetAIState: async ({ state }) => {
    'use server'

    const session = await auth()

    if (session && session.user) {
      const { chatId, messages } = state

      const createdAt = new Date()
      const userId = session.user.id as string
      const path = `/chat/${chatId}`

      const firstMessageContent = messages[0].content as string
      const title = firstMessageContent.substring(0, 100)

      const chat: Chat = {
        id: chatId,
        title,
        userId,
        createdAt,
        messages,
        path
      }

      await saveChat(chat)
    } else {
      return
    }
  }
})

export const getUIStateFromAIState = (aiState: Chat) => {
  return aiState.messages
    .filter(message => message.role !== 'system')
    .map((message, index) => ({
      id: `${aiState.chatId}-${index}`,
      display:
        message.role === 'user' ? (
          <UserMessage>{message.content as string}</UserMessage>
        ) : message.role === 'assistant' &&
          typeof message.content === 'string' ? (
          <BotMessage content={message.content} />
        ) : null
    }))
}
async function generateMeme(prompt: string) {
  // Using a placeholder image instead of Unsplash API
  return 'https://i.pinimg.com/originals/b2/2c/36/b22c366f0e8410df0a693ff9d26f1e3e.jpg'
}
