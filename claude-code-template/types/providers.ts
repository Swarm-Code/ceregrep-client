export type ModelProvider = 'anthropic' | 'openai' | 'openrouter' | 'cerebras' | 'google' | 'r1'

export interface ProviderConfig {
  type: ModelProvider
  name: string
  description: string
  apiKey?: string
  baseURL?: string
  region?: string
  projectId?: string
}

export interface ModelDefinition {
  id: string
  name: string
  description?: string
  inputTokenCost?: number
  outputTokenCost?: number
  contextWindow?: number
  isDefault?: boolean
}

export interface StoredProviderConfig extends ProviderConfig {
  apiKey?: string
  baseURL?: string
  region?: string
  projectId?: string
  models: ModelDefinition[]
  selectedModel?: string
  isActive?: boolean
}

export interface ProviderConfigData {
  activeProvider?: ModelProvider
  providers: Record<ModelProvider, StoredProviderConfig>
}