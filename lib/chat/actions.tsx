import 'server-only'
import fs from 'fs/promises'
import path from 'path'
import { XMLParser, XMLBuilder } from 'fast-xml-parser'

import {
  createAI,
  getMutableAIState,
  getAIState,
  streamUI,
} from 'ai/rsc'

async function getAvailableImages(): Promise<string> {
  try {
    const xmlPath = path.join(process.cwd(), 'components', 'ui', 'AVAILABLE_IMAGES.xml')

       const xmlContent = await fs.readFile(xmlPath, 'utf-8')

    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "" })
    const jsonObj = parser.parse(xmlContent)
    
    let images = jsonObj.image || []
    if (!Array.isArray(images)) {
      images = [images].filter(Boolean)
    }
    
    // Ensure images is always an array
    if (!Array.isArray(images)) {
      images = [images]
    }
    
    const shuffledImages = images.sort(() => Math.random() - 0.5)
    
    const builder = new XMLBuilder({ format: true })
    const result = builder.build({ images: { image: shuffledImages } })
    return result
  } catch (error) {
    console.error('Error in getAvailableImages:', error)
    // Return a default XML string with an error message
    return '<images><image>Error: Unable to load images</image></images>'
  }
}

import { anthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';
import { z } from 'zod';

import { nanoid } from '@/lib/utils'
import { saveChat } from '@/app/actions'
import { BotMessage, SpinnerMessage, UserMessage } from '@/components/ui/message'
import { Chat, Message } from '@/lib/types'
import { auth } from '@/auth'

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
        description: 'Generate a meme based on the user\'s story',
        parameters: z.object({
          userStory: z.string()
        }),
        generate: async function* ({ userStory }) {
          yield <SpinnerMessage />
          
          const availableImages = await getAvailableImages();
          const prompt = `You are tasked with creating an uplifting meme based on a user's personal story. Your goal is to analyze the story, identify any negative thought patterns, and create a meme that gently challenges these beliefs while offering a positive perspective.

Here is the user's story:
<user_story>
${userStory}
</user_story>

Here is the list of available images for the meme background:
<available_images>
${availableImages}
</available_images>

Follow these steps to complete the task:

1. Psychological Analysis:
   - Carefully read the user's story.
   - Identify any beliefs, thought patterns, or perspectives that may be negatively impacting the user's mental well-being.
   - Summarize your insights in 1-2 sentences.

2. Rationale:
   - Explain in 2-3 sentences how your meme will aim to empathetically reframe the user's perspective in an uplifting way.
   - Connect your explanation to the specific elements of the user's story and your psychological analysis.

3. Meme Text Creation:
   - Create a top text and bottom text for the meme.
   - The text should gently challenge the identified unhelpful beliefs and offer a positive, empowering perspective.
   - Aim to validate the user's feelings while reframing things in a constructive, hopeful way.
   - Keep the text concise and impactful. Make sure to keep it simple, suitable for a meme format.
   - Keep the text easy to understand. Strive to ensure readability at 7-th to 8-th grade level.
   - Add a single relatable positive emoji to bottom text
   - Always use user's language when writing meme text.

4. Image Selection:
   - Review the list of available images.
   - Choose the most relevant image that complements the message you want to convey.
   - The image should resonate with the user's story and the positive reframing you intend to provide.

5. Chat Reply Creation:
   - Generate a reply for the user's story in 3-4 sentences.
   - Avoid replicating the meme content, try to intricately complement it.
   - Work on keeping the tone of the message: optimistic and encouraging, informative and educational, casual and relatable, realistic and authentic.
   - Keep the text easy to understand. Strive to ensure readability at 7-th to 8-th grade level.
   - Focus on delivering easy and important actionable advice, focused on low-energy behavioral activation and battling negativity bias.
   - Always use user's language when writing chat reply.

Provide your output in the following format:

<psychological_analysis>
[Insert your 1-2 sentence summary here]
</psychological_analysis>

<rationale>
[Insert your 2-3 sentence explanation here]
</rationale>

<top_text>
[Insert the top text of the meme here]
</top_text>

<bottom_text>
[Insert the bottom text of the meme here]
</bottom_text>

<selected_image>
[Insert the name of the chosen image here]
</selected_image>

<chat_reply>
[Insert your 3-4 sentence reply here]
</chat_reply>

Remember to be compassionate, empathetic, and constructive in your analysis and meme creation. Your goal is to uplift and encourage the user while gently challenging any unhelpful thought patterns.`;

          const { text: response } = await generateText({
            model: anthropic('claude-3-haiku-20240307'),
            prompt,
          });

          const topText = response.match(/<top_text>([\s\S]*?)<\/top_text>/)?.[1]?.trim() || '';
          const bottomText = response.match(/<bottom_text>([\s\S]*?)<\/bottom_text>/)?.[1]?.trim() || '';
          const selectedImage = response.match(/<selected_image>([\s\S]*?)<\/selected_image>/)?.[1]?.trim() || '';
          const chatReply = response.match(/<chat_reply>([\s\S]*?)<\/chat_reply>/)?.[1].trim() || '';

          const imageUrl = `/images/memes/${selectedImage}.jpg`;

          return (
            <BotMessage
              content={chatReply}
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
