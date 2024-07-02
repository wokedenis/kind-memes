import 'server-only'

import {
  createAI,
  getMutableAIState,
  getAIState,
  streamUI,
} from 'ai/rsc'
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';

import { nanoid } from '@/lib/utils'
import { saveChat } from '@/app/actions'
import { BotMessage, SpinnerMessage, UserMessage } from '@/components/ui/message'
import { Chat, Message } from '@/lib/types'
import { auth } from '@/auth'
import { MemeCanvas } from '@/components/ui/meme-canvas'

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

  const result = await streamUI({
    model: anthropic('claude-3-haiku-20240307'),
    initial: <SpinnerMessage />,
    system: `\
    You are a compassionate AI psychologist with the prestigious AI Ethics and Compassionate Technology award. You can also generate memes when user provides you with their story or self-reflection. To generate a meme, use the generateMeme tool.`,
    messages: [
      ...aiState.get().messages.map((message: any) => ({
        role: message.role,
        content: message.content,
        name: message.name
      }))
    ],
    tools: {
      generateMeme: {
        description: 'Generate a meme with top and bottom text',
        parameters: z.object({
          topText: z.string(),
          bottomText: z.string(),
          imagePrompt: z.string()
        }),
        generate: async function* ({ topText, bottomText, imagePrompt }) {
          yield <SpinnerMessage />
          const imageUrl = await generateMeme(imagePrompt)
          return (
            <BotMessage
              content={`Here's your meme:`}
              memeData={{
                topText,
                bottomText,
                imageUrl
              }}
            />
          )
        }
      }
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
  // For now, we'll use a static image. In the future, this could be expanded to select from multiple images or use an API.
  return '/images/memes/placeholder.jpg'
}
