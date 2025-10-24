import React from 'react'
import { ToolResultBlockParam } from '@anthropic-ai/sdk/resources/index.mjs'
import { Message } from '../../../query.js'
import { Tool } from '../../../Tool.js'

export interface UserToolRejectMessageProps {
  param: ToolResultBlockParam
  message: Message
  messages: Message[]
  tools: Tool[]
  verbose: boolean
  width: number
}

export const UserToolRejectMessage: React.FC<UserToolRejectMessageProps> = ({ param, message, messages, tools, verbose, width }) => {
  const toolName = param.tool_use_id ? tools.find(tool => tool.name)?.name : undefined
  const errorMessage = Array.isArray(param.content)
    ? param.content.find(c => c.type === 'text')?.text || 'Tool execution failed'
    : typeof param.content === 'string'
    ? param.content
    : 'Tool execution failed'

  return (
    <div>
      {toolName && <div>Tool: {toolName}</div>}
      <div>Rejected: {errorMessage}</div>
    </div>
  )
}

export default UserToolRejectMessage