import React from 'react'
import { ToolResultBlockParam } from '@anthropic-ai/sdk/resources/index.mjs'
import { Message } from '../../../query.js'
import { Tool } from '../../../Tool.js'
import { UserToolSuccessMessage } from './UserToolSuccessMessage.js'
import { UserToolRejectMessage } from './UserToolRejectMessage.js'

type Props = {
  param: ToolResultBlockParam
  message: Message
  messages: Message[]
  tools: Tool[]
  verbose: boolean
  width: number
}

export function UserToolResultMessage({
  param,
  message,
  messages,
  tools,
  verbose,
  width,
}: Props): React.ReactNode {
  // Determine if this is a success or rejection based on error content
  const hasError = param.is_error || (param.content && Array.isArray(param.content) && param.content.some(
    content => content.type === 'text' && content.text?.toLowerCase().includes('error')
  ))

  if (hasError) {
    return (
      <UserToolRejectMessage
        param={param}
        message={message as any}
        messages={messages}
        tools={tools}
        verbose={verbose}
        width={width}
      />
    )
  }

  return (
    <UserToolSuccessMessage
      param={param}
      message={message as any}
      messages={messages}
      tools={tools}
      verbose={verbose}
      width={width}
    />
  )
}