import { useEffect, useReducer, useRef, useState } from 'react'

import ClipboardJS from 'clipboard'
import { throttle } from 'lodash-es'

import { ChatGPTProps, ChatMessage, ChatRole } from './interface'

const scrollDown = throttle(
  () => {
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
  },
  300,
  {
    leading: true,
    trailing: false
  }
)

const requestMessage = async (
  url: string,
  messages: ChatMessage[],
  controller: AbortController | null
) => {
  const response = await fetch(url, {
    method: 'POST',
    body: JSON.stringify({
      messages
    }),
    signal: controller?.signal
  })

  if (!response.ok) {
    throw new Error(response.statusText)
  }
  const data = response.body

  if (!data) {
    throw new Error('No data')
  }

  return data.getReader()
}

export const useChatGPT = (props: ChatGPTProps) => {
  const { fetchPath } = props
  const [, forceUpdate] = useReducer((x) => !x, false)
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      content: 
        "Hey there. I will be collecting some information from you today. " +
        "Could you first please confirm your email address is " +
        "<b>kareem.kudus@gmail.com</b> and your name is <b>Kareen Kudus</b>?",
      role: ChatRole.Assistant
    } 
  ])
  const [disabled] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(false)

  const controller = useRef<AbortController | null>(null)
  const currentMessage = useRef<string>('')

  const archiveCurrentMessage = () => {
    const content = currentMessage.current
    currentMessage.current = ''
    setLoading(false)
    if (content) {
      console.log('Archiving complete message:', content)
      setMessages((messages) => {
        const newMessages = [
          ...messages,
          {
            content,
            role: ChatRole.Assistant
          }
        ]
        console.log('Updated message history:', newMessages)
        return newMessages
      })
      scrollDown()
    }
  }

  const fetchMessage = async (messages: ChatMessage[]) => {
    try {
      console.log(messages)
      currentMessage.current = ''
      controller.current = new AbortController()
      setLoading(true)

      const reader = await requestMessage(fetchPath, messages, controller.current)
      const decoder = new TextDecoder()
      let done = false

      while (!done) {
        const { value, done: doneReading } = await reader.read()
        done = doneReading
        if (value) {
          const chunkValue = decoder.decode(value)
          
          try {
            // Try to parse as JSON
            const parsedChunk = JSON.parse(chunkValue)
            
            // If it's an internal message, just add it to messages but don't update currentMessage
            if (parsedChunk.isInternal) {
              setMessages(msgs => [...msgs, parsedChunk])
              continue
            }
            
            // For normal messages, only use the parsed JSON if it has a content property
            if (parsedChunk.content !== undefined) {
              currentMessage.current += parsedChunk.content
            } else {
              // If it's parsed JSON but doesn't have content property, use the raw chunk
              currentMessage.current += chunkValue
            }
          } catch (e) {
            // If it's not valid JSON, use the raw chunk
            currentMessage.current += chunkValue
          }
          forceUpdate()
          scrollDown()
        }
      }

      archiveCurrentMessage()
    } catch (e) {
      console.error(e)
      setLoading(false)
      return
    }
  }

  const onStop = () => {
    if (controller.current) {
      controller.current.abort()
      archiveCurrentMessage()
    }
  }

  const onSend = (message: ChatMessage) => {
    const newMessages = [...messages, message]
    setMessages(newMessages)
    fetchMessage(newMessages)
  }

  const onClear = () => {
    setMessages([])
  }

  useEffect(() => {
    new ClipboardJS('.chat-wrapper .copy-btn')
  }, [])

  return {
    loading,
    disabled,
    messages,
    currentMessage,
    onSend,
    onClear,
    onStop
  }
}
