// Types for log handling and display

export interface LogOption {
  value: string
  label: string
  date?: Date
  size?: number
  forkNumber?: number
  modified?: Date
  created?: Date
  messageCount?: number
  firstPrompt?: string
  sidechainNumber?: number
  messages?: any[] // For storing loaded messages
}

export interface LogListProps {
  context: {
    unmount?: () => void
  }
}

// Type for serialized messages used in logging
export interface SerializedMessage {
  id: string
  type: 'user' | 'assistant' | 'progress'
  timestamp: Date
  content: any
  metadata?: Record<string, any>
}