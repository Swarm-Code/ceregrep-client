import React from 'react'
import { ToolResultBlockParam } from '@anthropic-ai/sdk/resources/index.mjs'
import { Message } from '../../../query.js'
import { Tool } from '../../../Tool.js'

export interface UserToolSuccessMessageProps {
  param: ToolResultBlockParam
  message: Message
  messages: Message[]
  tools: Tool[]
  verbose: boolean
  width: number
}

export const UserToolSuccessMessage: React.FC<UserToolSuccessMessageProps> = ({ param, message, messages, tools, verbose, width }) => {
  const toolName = param.tool_use_id ? tools.find(tool => tool.name)?.name : undefined
  const successMessage = Array.isArray(param.content)
    ? param.content.find(c => c.type === 'text')?.text || 'Tool executed successfully'
    : typeof param.content === 'string'
    ? param.content
    : 'Tool executed successfully'

  return (
    <div>
      {toolName && <div>Tool: {toolName}</div>}
      <div>Success: {successMessage}</div>
      {verbose && param.content && <div>Result: {JSON.stringify(param.content)}</div>}
    </div>
  )
}

export default UserToolSuccessMessage