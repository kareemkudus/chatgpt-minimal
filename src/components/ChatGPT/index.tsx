import React, { useRef, useEffect } from 'react'

import { ChatGPTProps, ChatRole } from './interface'
import MessageItem from './MessageItem'
import SendBar from './SendBar'
import { useChatGPT } from './useChatGPT'

import './index.less'
import 'highlight.js/styles/atom-one-dark.css'

const ChatGPT = (props: ChatGPTProps) => {
  const { loading, disabled, messages, currentMessage, onSend, onClear, onStop } = useChatGPT(props)
  const chatEndRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, currentMessage])

  // Filter out tool-related messages for display
  const displayMessages = messages.filter(
    message => message.role !== ChatRole.Tool && !message.tool_calls
  )

  return (
    <div className="chat-wrapper">
      {displayMessages.map((message, index) => (
        <MessageItem key={index} message={message} />
      ))}
      {currentMessage.current && !messages.some(m => m.content === currentMessage.current) && (
        <MessageItem 
          message={{ 
            content: currentMessage.current, 
            role: ChatRole.Assistant 
          }} 
        />
      )}
      <div ref={chatEndRef} />
      <SendBar
        loading={loading}
        disabled={disabled}
        onSend={onSend}
        onClear={onClear}
        onStop={onStop}
        messages={messages}
      />
    </div>
  )
}

export default ChatGPT
