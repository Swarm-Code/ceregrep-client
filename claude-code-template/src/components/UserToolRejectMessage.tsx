import React from 'react'

export interface UserToolRejectMessageProps {
  message: string
  toolName?: string
}

export const UserToolRejectMessage: React.FC<UserToolRejectMessageProps> = ({ message, toolName }) => {
  return (
    <div>
      {toolName && <div>Tool: {toolName}</div>}
      <div>Rejected: {message}</div>
    </div>
  )
}

export default UserToolRejectMessage