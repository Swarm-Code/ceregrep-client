/**
 * Model Manager Component
 * Multi-model workflow: Provider List -> Model List -> Add/Edit Model
 */

import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { SelectList, SelectListItem } from './common/SelectList.js';
import { FormEditor, FormField } from './common/FormEditor.js';
import { Modal } from './common/Modal.js';
import {
  loadProviderConfig,
  saveProviderConfig,
  addModelToProvider,
  removeModelFromProvider,
  setActiveModel,
  setGlobalActiveModel,
  getActiveModel,
  loadGlobalProviderConfig,
  saveGlobalProviderConfig,
  ProviderType,
  ProviderModel,
  ProviderConfig,
} from '../../config/swarmrc-loader.js';

interface ModelManagerProps {
  onCancel: () => void;
  onProviderChange?: () => void;
}

// Color constants
const CYAN = '#22D3EE';
const WHITE = '#FFFFFF';
const DIM_WHITE = '#9CA3AF';
const GREEN = '#10B981';
const YELLOW = '#F59E0B';
const PURPLE = '#A855F7';
const RED = '#EF4444';

type View = 'list' | 'models' | 'addModel' | 'editModel' | 'oauth';

interface ProviderInfo {
  type: ProviderType;
  name: string;
  description: string;
  defaultBaseURL?: string;
  requiresApiKey: boolean;
  supportsCustomEndpoint: boolean;
}

const PROVIDERS: ProviderInfo[] = [
  {
    type: 'anthropic',
    name: 'Anthropic (Claude)',
    description: 'Claude models via API key or OAuth',
    requiresApiKey: true,
    supportsCustomEndpoint: false,
  },
  {
    type: 'cerebras',
    name: 'Cerebras',
    description: 'Ultra-fast inference with Llama models',
    defaultBaseURL: 'https://api.cerebras.ai/v1',
    requiresApiKey: true,
    supportsCustomEndpoint: true,
  },
  {
    type: 'openai',
    name: 'OpenAI',
    description: 'GPT-4, GPT-4 Turbo, GPT-3.5',
    defaultBaseURL: 'https://api.openai.com/v1',
    requiresApiKey: true,
    supportsCustomEndpoint: true,
  },
  {
    type: 'openrouter',
    name: 'OpenRouter',
    description: 'Access to 100+ models through one API',
    defaultBaseURL: 'https://openrouter.ai/api/v1',
    requiresApiKey: true,
    supportsCustomEndpoint: false,
  },
  {
    type: 'r1',
    name: 'OpenAI Compatible',
    description: 'Any OpenAI-compatible API endpoint',
    requiresApiKey: false,
    supportsCustomEndpoint: true,
  },
  {
    type: 'google',
    name: 'Google AI (Gemini)',
    description: 'Gemini Pro and Flash models',
    requiresApiKey: true,
    supportsCustomEndpoint: false,
  },
];

interface ModalState {
  show: boolean;
  type: 'confirm' | 'alert' | 'error' | 'success';
  title: string;
  message: string;
  onConfirm?: () => void;
}

export const ModelManager: React.FC<ModelManagerProps> = ({ onCancel, onProviderChange }) => {
  const [view, setView] = useState<View>('list');
  const [selectedProvider, setSelectedProvider] = useState<ProviderType | null>(null);
  const [providerConfig, setProviderConfig] = useState<ProviderConfig | null>(null);
  const [editingModelName, setEditingModelName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>({
    show: false,
    type: 'alert',
    title: '',
    message: '',
  });

  // Get the currently active provider and model
  const [currentActiveProvider, setCurrentActiveProvider] = useState<ProviderType | null>(null);
  const [currentActiveModel, setCurrentActiveModel] = useState<string | null>(null);
  const [providerSummaries, setProviderSummaries] = useState<Record<ProviderType, { modelCount: number }>>({} as any);

  // OAuth state (must be at top level to avoid hook order violations)
  const [oauthStatus, setOAuthStatus] = useState<{authenticated: boolean; loading: boolean}>({
    authenticated: false,
    loading: true,
  });
  const [oauthInitialized, setOAuthInitialized] = useState(false);

  useEffect(() => {
    // Load currently active provider/model from all providers
    loadActiveProviderModel();
    loadProviderSummaries();
  }, []);

  // Check OAuth status when entering OAuth view
  useEffect(() => {
    if (view === 'oauth') {
      const checkOAuthStatus = async () => {
        try {
          const { getOAuthManager } = await import('../../auth/oauth-manager-instance.js');
          const manager = getOAuthManager();
          const token = await manager.getProvider('anthropic')?.getToken();
          setOAuthStatus({ authenticated: !!token, loading: false });
        } catch {
          setOAuthStatus({ authenticated: false, loading: false });
        }
      };
      checkOAuthStatus();
    }
  }, [view]);

  const loadActiveProviderModel = async () => {
    // Get the currently active model across all providers
    const active = await getActiveModel();
    if (active) {
      setCurrentActiveProvider(active.provider);
      setCurrentActiveModel(active.model.name);
    }
  };

  const loadProviderSummaries = async () => {
    const summaries: Record<string, { modelCount: number }> = {};
    for (const provider of PROVIDERS) {
      // For anthropic, count both local and global (OAuth) models
      if (provider.type === 'anthropic') {
        const localConfig = await loadProviderConfig('anthropic');
        const globalConfig = await loadGlobalProviderConfig('anthropic');
        const totalModels = Object.keys({...globalConfig.models, ...localConfig.models}).length;
        summaries['anthropic'] = { modelCount: totalModels };
      } else {
        const config = await loadProviderConfig(provider.type);
        summaries[provider.type] = { modelCount: Object.keys(config.models).length };
      }
    }
    setProviderSummaries(summaries as any);
  };

  const handleListAction = async (key: string, item?: SelectListItem, index?: number) => {
    switch (key.toLowerCase()) {
      case 'enter':
      case ' ':
        if (item && item.id) {
          const providerType = item.id as ProviderType;
          setSelectedProvider(providerType);

          // Special handling for OAuth provider
          if (item.id === 'anthropic-oauth') {
            setView('oauth' as View);
            return;
          }

          // Load models for this provider
          const config = await loadProviderConfig(providerType);
          setProviderConfig(config);
          setView('models');
        }
        break;

      case 'escape':
      case 'q':
        onCancel();
        break;
    }
  };

  const handleModelsAction = async (key: string, item?: SelectListItem, index?: number) => {
    switch (key.toLowerCase()) {
      case 'enter':
      case ' ':
        // Select this model as active
        if (item && item.id && selectedProvider) {
          try {
            // Use global functions for OAuth models, local for others
            const isOAuth = isOAuthModel(item.id);
            if (isOAuth) {
              // Update global config (where OAuth models are stored)
              await setGlobalActiveModel(selectedProvider, item.id);
              // Also update project config so it takes effect in current project
              await setActiveModel(selectedProvider, item.id);
            } else {
              await setActiveModel(selectedProvider, item.id);
            }

            // Reload merged config for anthropic, regular for others
            let config;
            if (selectedProvider === 'anthropic') {
              const localConfig = await loadProviderConfig('anthropic');
              const globalConfig = await loadGlobalProviderConfig('anthropic');
              config = { models: {...globalConfig.models, ...localConfig.models} };
            } else {
              config = await loadProviderConfig(selectedProvider);
            }
            setProviderConfig(config);

            // Update current active
            setCurrentActiveProvider(selectedProvider);
            setCurrentActiveModel(item.id);

            setModal({
              show: true,
              type: 'success',
              title: 'Model Activated',
              message: `Successfully activated "${item.id}" for ${PROVIDERS.find(p => p.type === selectedProvider)?.name}`,
              onConfirm: () => {
                setModal({ ...modal, show: false });
                if (onProviderChange) {
                  onProviderChange();
                }
              },
            });
          } catch (error) {
            setModal({
              show: true,
              type: 'error',
              title: 'Activation Error',
              message: `Failed to activate model: ${error instanceof Error ? error.message : String(error)}`,
              onConfirm: () => setModal({ ...modal, show: false }),
            });
          }
        }
        break;

      case 'a':
        // Add new model
        setEditingModelName(null);
        setView('addModel');
        break;

      case 'd':
        // Delete selected model
        if (item && item.id && selectedProvider) {
          setModal({
            show: true,
            type: 'confirm',
            title: 'Delete Model',
            message: `Are you sure you want to delete "${item.id}"?`,
            onConfirm: async () => {
              try {
                await removeModelFromProvider(selectedProvider, item.id);

                // Reload provider config
                const config = await loadProviderConfig(selectedProvider);
                setProviderConfig(config);

                setModal({
                  show: true,
                  type: 'success',
                  title: 'Model Deleted',
                  message: `Successfully deleted "${item.id}"`,
                  onConfirm: () => setModal({ ...modal, show: false }),
                });
              } catch (error) {
                setModal({
                  show: true,
                  type: 'error',
                  title: 'Delete Error',
                  message: `Failed to delete model: ${error instanceof Error ? error.message : String(error)}`,
                  onConfirm: () => setModal({ ...modal, show: false }),
                });
              }
            },
          });
        }
        break;

      case 'e':
        // Edit selected model
        if (item && item.id) {
          setEditingModelName(item.id);
          setView('editModel');
        }
        break;

      case 'escape':
        // Go back to provider list
        setSelectedProvider(null);
        setProviderConfig(null);
        setView('list');
        break;
    }
  };

  const handleModelFormSubmit = async (values: Record<string, string>) => {
    if (!selectedProvider) return;

    setLoading(true);
    setMessage(null);

    try {
      const modelName = values.modelName || editingModelName;
      if (!modelName) {
        throw new Error('Model name is required');
      }

      const model: ProviderModel = {
        name: modelName,
        apiKey: values.apiKey || undefined,
        baseURL: values.baseURL || undefined,
        temperature: values.temperature ? parseFloat(values.temperature) : undefined,
        top_p: values.top_p ? parseFloat(values.top_p) : undefined,
        isDefault: values.isDefault === 'true',
      };

      await addModelToProvider(selectedProvider, model);

      // Reload provider config
      const config = await loadProviderConfig(selectedProvider);
      setProviderConfig(config);

      setModal({
        show: true,
        type: 'success',
        title: editingModelName ? 'Model Updated' : 'Model Added',
        message: `Successfully ${editingModelName ? 'updated' : 'added'} model "${modelName}"`,
        onConfirm: () => {
          setModal({ ...modal, show: false });
          setEditingModelName(null);
          setView('models');
        },
      });
    } catch (error) {
      setModal({
        show: true,
        type: 'error',
        title: 'Configuration Error',
        message: `Failed to save model: ${error instanceof Error ? error.message : String(error)}`,
        onConfirm: () => setModal({ ...modal, show: false }),
      });
    }

    setLoading(false);
  };

  const handleModelFormCancel = () => {
    setEditingModelName(null);
    setView('models');
  };

  // Helper to check if a specific model is an OAuth model
  const isOAuthModel = (modelName: string): boolean => {
    if (!providerConfig) return false;
    const model = providerConfig.models[modelName];
    return model?.apiKey === 'oauth';
  };

  // Ensure OAuth models exist in the GLOBAL provider config
  const ensureOAuthModelsExist = async () => {
    const config = await loadGlobalProviderConfig('anthropic');

    const oauthModels = {
      'claude-sonnet-4-5-20250929': {
        name: 'claude-sonnet-4-5-20250929',
        apiKey: 'oauth', // Special marker for OAuth
        temperature: 0.7,
        top_p: 0.9,
        isDefault: Object.keys(config.models).length === 0, // First model is default
      },
      'claude-haiku-4-5-20251001': {
        name: 'claude-haiku-4-5-20251001',
        apiKey: 'oauth',
        temperature: 0.7,
        top_p: 0.9,
        isDefault: false,
      },
      'claude-opus-4-1-20250805': {
        name: 'claude-opus-4-1-20250805',
        apiKey: 'oauth',
        temperature: 0.7,
        top_p: 0.9,
        isDefault: false,
      },
    };

    // Add models that don't exist
    let updated = false;
    for (const [modelName, modelConfig] of Object.entries(oauthModels)) {
      if (!config.models[modelName]) {
        config.models[modelName] = modelConfig;
        updated = true;
      }
    }

    // Save to GLOBAL config if we added any models
    if (updated) {
      await saveGlobalProviderConfig('anthropic', config);
    }
  };

  // OAuth handler functions
  const handleOAuthLogin = async () => {
    try {
      setMessage('Initiating OAuth authentication...');
      const { getOAuthManager, initializeOAuthProviders } = await import('../../auth/oauth-manager-instance.js');

      // Only initialize once
      if (!oauthInitialized) {
        initializeOAuthProviders();
        setOAuthInitialized(true);
      }

      const manager = getOAuthManager();
      const provider = manager.getProvider('anthropic');
      if (provider) {
        await provider.initiateAuth();

        // After successful authentication, create OAuth models if they don't exist (GLOBALLY)
        await ensureOAuthModelsExist();

        // Update the status
        setOAuthStatus({ authenticated: true, loading: false });
        setMessage('Successfully authenticated with Claude Code!');

        // Load the GLOBAL provider config and switch to models view
        const config = await loadGlobalProviderConfig('anthropic');
        setProviderConfig(config);
        setView('models');
      }
    } catch (error) {
      setModal({
        show: true,
        type: 'error',
        title: 'OAuth Error',
        message: `Failed to initiate OAuth: ${error instanceof Error ? error.message : String(error)}`,
        onConfirm: () => setModal({ ...modal, show: false }),
      });
      // On error, ensure status reflects unauthenticated state
      setOAuthStatus({ authenticated: false, loading: false });
    }
  };

  const handleOAuthLogout = async () => {
    try {
      const { getOAuthManager } = await import('../../auth/oauth-manager-instance.js');
      const manager = getOAuthManager();
      await manager.logout('anthropic');
      setOAuthStatus({ authenticated: false, loading: false });
      setMessage('Successfully logged out of Claude Code');
    } catch (error) {
      setModal({
        show: true,
        type: 'error',
        title: 'Logout Error',
        message: `Failed to logout: ${error instanceof Error ? error.message : String(error)}`,
        onConfirm: () => setModal({ ...modal, show: false }),
      });
    }
  };

  // Top-level useInput hook to handle all view inputs
  useInput((input, key) => {
    // OAuth-related inputs for Anthropic provider
    if (selectedProvider === 'anthropic' && input.toLowerCase() === 'l') {
      if (oauthStatus.authenticated) {
        handleOAuthLogout();
      } else {
        handleOAuthLogin();
      }
      return;
    }

    // OAuth view specific inputs (kept for backward compatibility)
    if (view === 'oauth') {
      if (key.escape) {
        setSelectedProvider(null);
        setView('list');
        return;
      }

      if (input.toLowerCase() === 'l') {
        if (oauthStatus.authenticated) {
          handleOAuthLogout();
        } else {
          handleOAuthLogin();
        }
      }
    }
  });

  // Render provider list view
  if (view === 'list') {
    const items: SelectListItem[] = PROVIDERS.map(provider => {
      const summary = providerSummaries[provider.type] || { modelCount: 0 };
      const modelCount = summary.modelCount;
      const isActive = currentActiveProvider === provider.type;

      return {
        id: provider.type,
        label: provider.name,
        description: `${provider.description} (${modelCount} model${modelCount !== 1 ? 's' : ''})`,
        badge: isActive ? 'ACTIVE' : undefined,
        badgeColor: isActive ? GREEN : undefined,
      };
    });

    return (
      <Box flexDirection="column" padding={1}>
        {/* Header */}
        <Box marginBottom={1}>
          <Text bold color={CYAN}>
            ⚡ Model Provider Selection
          </Text>
        </Box>

        {loading && (
          <Box marginBottom={1}>
            <Text color={YELLOW}>Loading...</Text>
          </Box>
        )}

        {message && (
          <Box marginBottom={1}>
            <Text color={YELLOW}>{message}</Text>
          </Box>
        )}

        {/* Help text */}
        <Box marginBottom={1}>
          <Text color={DIM_WHITE}>
            Select a provider to manage its models. Press Enter to view models.
          </Text>
        </Box>

        {/* Provider list */}
        <SelectList
          items={items}
          onSelect={async (item) => {
            const providerType = item.id as ProviderType;
            setSelectedProvider(providerType);

            // For anthropic, merge local and global (OAuth) models
            if (providerType === 'anthropic') {
              // Check OAuth status
              try {
                const { getOAuthManager } = await import('../../auth/oauth-manager-instance.js');
                const manager = getOAuthManager();
                const token = await manager.getProvider('anthropic')?.getToken();
                setOAuthStatus({ authenticated: !!token, loading: false });

                // Ensure OAuth models exist if authenticated
                if (token) {
                  await ensureOAuthModelsExist();
                }
              } catch {
                setOAuthStatus({ authenticated: false, loading: false });
              }

              // Merge local and global configs
              const localConfig = await loadProviderConfig('anthropic');
              const globalConfig = await loadGlobalProviderConfig('anthropic');
              const mergedConfig = {
                models: {...globalConfig.models, ...localConfig.models}
              };
              setProviderConfig(mergedConfig);
            } else {
              const config = await loadProviderConfig(providerType);
              setProviderConfig(config);
            }

            setView('models');
          }}
          onCancel={onCancel}
          onAction={handleListAction}
        />

        {/* Footer shortcuts */}
        <Box marginTop={1} borderStyle="single" borderColor={DIM_WHITE} paddingX={1}>
          <Text color={DIM_WHITE}>
            <Text color={CYAN}>Enter</Text> View Models • <Text color={CYAN}>↑↓</Text> Navigate • <Text color={CYAN}>Esc</Text> Exit
          </Text>
        </Box>

        {modal.show && (
          <Modal
            title={modal.title}
            message={modal.message}
            type={modal.type}
            onConfirm={modal.onConfirm}
            onCancel={() => setModal({ ...modal, show: false })}
          />
        )}
      </Box>
    );
  }

  // Render model list view
  if (view === 'models' && selectedProvider && providerConfig) {
    const providerInfo = PROVIDERS.find(p => p.type === selectedProvider)!;
    const models = Object.entries(providerConfig.models);

    const items: SelectListItem[] = models.map(([name, model]) => {
      const badges: string[] = [];
      const badgeColors: string[] = [];

      // Show OAuth badge for OAuth models
      if (model.apiKey === 'oauth') {
        badges.push('OAUTH');
        badgeColors.push(CYAN);
      }

      if (model.isDefault) {
        badges.push('DEFAULT');
        badgeColors.push(PURPLE);
      }

      if (currentActiveProvider === selectedProvider && currentActiveModel === name) {
        badges.push('ACTIVE');
        badgeColors.push(GREEN);
      }

      return {
        id: name,
        label: name,
        description: model.name,
        badge: badges.length > 0 ? badges.join(' • ') : undefined,
        badgeColor: badgeColors[0],
      };
    });

    return (
      <Box flexDirection="column" padding={1}>
        {/* Header */}
        <Box marginBottom={1}>
          <Text bold color={CYAN}>
            Models for {providerInfo.name}
          </Text>
        </Box>

        {/* OAuth Status for Anthropic */}
        {selectedProvider === 'anthropic' && (
          <Box marginBottom={1} flexDirection="row">
            <Text>OAuth Status: </Text>
            <Text color={oauthStatus.authenticated ? GREEN : YELLOW}>
              {oauthStatus.authenticated ? '✓ Authenticated' : '✗ Not Authenticated'}
            </Text>
            {!oauthStatus.authenticated && (
              <Text color={DIM_WHITE}> (Press L to login for OAuth models)</Text>
            )}
          </Box>
        )}

        {models.length === 0 ? (
          <Box marginBottom={1}>
            <Text color={YELLOW}>No models configured. Press 'A' to add a model.</Text>
          </Box>
        ) : (
          <>
            <Box marginBottom={1}>
              <Text color={DIM_WHITE}>
                Select a model to activate it, or press 'A' to add a new model.
              </Text>
            </Box>

            <SelectList
              items={items}
              onSelect={async (item) => {
                // Activate this model
                try {
                  // Use global functions for OAuth models, local for others
                  const isOAuth = isOAuthModel(item.id);
                  if (isOAuth) {
                    // Update global config (where OAuth models are stored)
                    await setGlobalActiveModel(selectedProvider, item.id);
                    // Also update project config so it takes effect in current project
                    await setActiveModel(selectedProvider, item.id);
                  } else {
                    await setActiveModel(selectedProvider, item.id);
                  }

                  // Reload merged config for anthropic, regular for others
                  let config;
                  if (selectedProvider === 'anthropic') {
                    const localConfig = await loadProviderConfig('anthropic');
                    const globalConfig = await loadGlobalProviderConfig('anthropic');
                    config = { models: {...globalConfig.models, ...localConfig.models} };
                  } else {
                    config = await loadProviderConfig(selectedProvider);
                  }
                  setProviderConfig(config);

                  // Update current active
                  setCurrentActiveProvider(selectedProvider);
                  setCurrentActiveModel(item.id);

                  setModal({
                    show: true,
                    type: 'success',
                    title: 'Model Activated',
                    message: `Successfully activated "${item.id}"`,
                    onConfirm: () => {
                      setModal({ ...modal, show: false });
                      if (onProviderChange) {
                        onProviderChange();
                      }
                    },
                  });
                } catch (error) {
                  setModal({
                    show: true,
                    type: 'error',
                    title: 'Activation Error',
                    message: `Failed to activate model: ${error instanceof Error ? error.message : String(error)}`,
                    onConfirm: () => setModal({ ...modal, show: false }),
                  });
                }
              }}
              onCancel={() => {
                setSelectedProvider(null);
                setProviderConfig(null);
                setView('list');
              }}
              onAction={handleModelsAction}
            />
          </>
        )}

        {/* Footer shortcuts */}
        <Box marginTop={1} borderStyle="single" borderColor={DIM_WHITE} paddingX={1}>
          <Text color={DIM_WHITE}>
            <Text color={CYAN}>Enter</Text> Select/Edit • <Text color={CYAN}>A</Text> Add Model •
            <Text color={CYAN}> D</Text> Delete • <Text color={CYAN}>Esc</Text> Back
          </Text>
        </Box>

        {modal.show && (
          <Modal
            title={modal.title}
            message={modal.message}
            type={modal.type}
            onConfirm={modal.onConfirm}
            onCancel={() => setModal({ ...modal, show: false })}
          />
        )}
      </Box>
    );
  }

  // Render add/edit model form
  if ((view === 'addModel' || view === 'editModel') && selectedProvider) {
    const providerInfo = PROVIDERS.find(p => p.type === selectedProvider)!;
    const fields: FormField[] = [];

    // Get existing model data if editing
    const existingModel: ProviderModel | undefined = editingModelName ? providerConfig?.models[editingModelName] : undefined;

    // Model name field (only for new models)
    if (view === 'addModel') {
      fields.push({
        name: 'modelName',
        label: 'Model Name',
        type: 'text',
        value: '',
        placeholder: selectedProvider === 'anthropic' ? 'claude-sonnet-4-20250514' :
                     selectedProvider === 'cerebras' ? 'llama-3.3-70b' :
                     selectedProvider === 'openai' ? 'gpt-4-turbo' :
                     selectedProvider === 'openrouter' ? 'anthropic/claude-3.5-sonnet' :
                     selectedProvider === 'google' ? 'gemini-pro' :
                     'custom-model',
        required: true,
      });
    }

    // API Key field (if required)
    if (providerInfo.requiresApiKey) {
      fields.push({
        name: 'apiKey',
        label: 'API Key',
        type: 'text',
        value: existingModel?.apiKey || '',
        placeholder: 'sk-...',
        required: true,
      });
    }

    // Base URL field (if supported)
    if (providerInfo.supportsCustomEndpoint) {
      fields.push({
        name: 'baseURL',
        label: 'Base URL',
        type: 'text',
        value: existingModel?.baseURL || '',
        placeholder: providerInfo.defaultBaseURL || 'https://api.example.com/v1',
        required: false,
      });
    }

    // Temperature field
    fields.push({
      name: 'temperature',
      label: 'Temperature',
      type: 'text',
      value: existingModel?.temperature?.toString() || '',
      placeholder: '0.7',
      required: false,
    });

    // Top P field
    fields.push({
      name: 'top_p',
      label: 'Top P',
      type: 'text',
      value: existingModel?.top_p?.toString() || '',
      placeholder: '0.9',
      required: false,
    });

    // Set as Default checkbox
    fields.push({
      name: 'isDefault',
      label: 'Set as Default',
      type: 'select',
      value: existingModel?.isDefault ? 'true' : 'false',
      options: [
        { label: 'Yes', value: 'true' },
        { label: 'No', value: 'false' },
      ],
      required: false,
    });

    return (
      <Box flexDirection="column" padding={1}>
        {/* Header */}
        <Box marginBottom={1}>
          <Text bold color={CYAN}>
            {view === 'addModel' ? 'Add Model' : `Edit Model: ${editingModelName}`} - {providerInfo.name}
          </Text>
        </Box>

        <Box marginBottom={1}>
          <Text color={DIM_WHITE}>
            {providerInfo.description}
          </Text>
        </Box>

        {/* Configuration form */}
        <FormEditor
          fields={fields}
          onSubmit={handleModelFormSubmit}
          onCancel={handleModelFormCancel}
          submitLabel={view === 'addModel' ? 'Add Model' : 'Update Model'}
          title=""
        />

        {modal.show && (
          <Modal
            title={modal.title}
            message={modal.message}
            type={modal.type}
            onConfirm={modal.onConfirm}
            onCancel={() => setModal({ ...modal, show: false })}
          />
        )}
      </Box>
    );
  }

  // Render OAuth management view
  if (view === 'oauth') {
    return (
      <Box flexDirection="column" padding={1}>
        <Box marginBottom={1}>
          <Text bold color={CYAN}>Claude Code (OAuth)</Text>
        </Box>

        <Box marginBottom={1}>
          <Text color={DIM_WHITE}>
            Authenticate with your Claude Pro or Max account to use Claude models via OAuth
          </Text>
        </Box>

        {oauthStatus.loading ? (
          <Box marginY={1}>
            <Text color={YELLOW}>Loading authentication status...</Text>
          </Box>
        ) : (
          <Box flexDirection="column" marginY={1}>
            <Box marginBottom={1}>
              <Text>Status: </Text>
              <Text color={oauthStatus.authenticated ? GREEN : RED}>
                {oauthStatus.authenticated ? '✓ Authenticated' : '✗ Not Authenticated'}
              </Text>
            </Box>

            {oauthStatus.authenticated ? (
              <Box flexDirection="column">
                <Text color={GREEN}>You are signed in to Claude Code</Text>
                <Box marginTop={1}>
                  <Text color={CYAN}>Press L to logout</Text>
                </Box>
              </Box>
            ) : (
              <Box flexDirection="column">
                <Text color={YELLOW}>Sign in to use your Claude Pro/Max subscription</Text>
                <Box marginTop={1}>
                  <Text color={CYAN}>Press L to login</Text>
                </Box>
              </Box>
            )}
          </Box>
        )}

        {message && (
          <Box marginY={1}>
            <Text color={YELLOW}>{message}</Text>
          </Box>
        )}

        <Box marginTop={1} borderStyle="single" borderColor={DIM_WHITE} paddingX={1}>
          <Text color={DIM_WHITE}>
            <Text color={CYAN}>L</Text> {oauthStatus.authenticated ? 'Logout' : 'Login'} •
            <Text color={CYAN}> Esc</Text> Back
          </Text>
        </Box>

        {modal.show && (
          <Modal
            title={modal.title}
            message={modal.message}
            type={modal.type}
            onConfirm={modal.onConfirm}
            onCancel={() => setModal({ ...modal, show: false })}
          />
        )}
      </Box>
    );
  }

  return null;
};
