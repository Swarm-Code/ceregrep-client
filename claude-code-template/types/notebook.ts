// Types for Jupyter notebook handling

export type NotebookCellType = 'code' | 'markdown' | 'raw'

export type NotebookContent = NotebookDocument

// Add missing types for compatibility
export interface NotebookCellSource {
  cell: number
  cellType: 'code' | 'markdown' | 'raw'
  source: string
  language: string
  execution_count?: number | null
  outputs?: NotebookCellSourceOutput[]
}

export interface NotebookCellSourceOutput {
  output_type: 'execute_result' | 'display_data' | 'stream' | 'error'
  text?: string
  image?: NotebookOutputImage
}

export interface NotebookOutputImage {
  image_data: string
  media_type: 'image/png' | 'image/jpeg'
}

export type NotebookCellOutput = NotebookOutput

export interface NotebookCell {
  cell_type: 'code' | 'markdown' | 'raw'
  source: string | string[]
  metadata?: Record<string, any>
  execution_count?: number | null
  outputs?: NotebookOutput[]
}

export interface NotebookOutput {
  output_type: 'execute_result' | 'display_data' | 'stream' | 'error'
  data?: Record<string, any>
  metadata?: Record<string, any>
  execution_count?: number
  name?: string
  text?: string | string[]
  ename?: string
  evalue?: string
  traceback?: string[]
}

export interface NotebookDocument {
  cells: NotebookCell[]
  metadata: Record<string, any>
  nbformat: number
  nbformat_minor: number
}

export interface NotebookEditOperation {
  cellIndex: number
  newSource: string
  cellType?: 'code' | 'markdown' | 'raw'
}