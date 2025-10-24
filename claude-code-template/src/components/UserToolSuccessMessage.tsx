import React from 'react'

export interface UserToolSuccessMessageProps {
  message: string
  toolName?: string
  result?: any
}

export const UserToolSuccessMessage: React.FC<UserToolSuccessMessageProps> = ({ message, toolName, result }) => {
  return (
    <div>
      {toolName && <div>Tool: {toolName}</div>}
      <div>Success: {message}</div>
      {result && <div>Result: {JSON.stringify(result)}</div>}
    </div>
  )
}

export default UserToolSuccessMessage