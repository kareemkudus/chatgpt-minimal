export interface Message {
  role: Role
  content?: string
  id?: string
  type?: string
  name?: string
  tool_call_id?: string
  isInternal?: boolean
  arguments?: string
  tool_calls?: {
    id?: string
    type: string
    function: {
      name: string
      arguments: string
    }
  }[]
}

export type Role = 'user' | 'assistant' | 'system' | 'tool'
