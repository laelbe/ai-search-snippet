/**
 * Core type definitions for the Search Snippet Library
 */

export type ComponentMode = 'search' | 'chat';
export type Theme = 'light' | 'dark' | 'auto';
export type GenerateMode = 'list' | 'summarize';

export type Clients = 'nlweb' | 'ai-search';
/**
 * Main component properties
 */
export interface SearchSnippetProps {
  /** Required: nlweb API endpoint */
  apiUrl: string;
  /** Interface mode: search or chat */
  mode?: ComponentMode;
  /** Optional: API authentication key */
  apiKey?: string;
  /** Input placeholder text */
  placeholder?: string;
  /** Maximum search results to display */
  maxResults?: number;
  /** Input debounce delay in milliseconds */
  debounceMs?: number;
  /** Enable/disable streaming responses */
  enableStreaming?: boolean;
  /** Color scheme */
  theme?: Theme;

  client: Clients;
}

/**
 * Search result item structure
 */
export interface SearchResult {
  id: string;
  title: string;
  description: string;
  url?: string;
  metadata?: Record<string, unknown>;
  type: 'result';
}

export interface SearchError {
  type: 'error';
  message: string;
  code?: string;
  status?: number;
  details?: Record<string, unknown>;
}

export type ChatResult = {
  id: string;
  title: string;
  description: string;
  url?: string;
  metadata?: Record<string, unknown>;
  type: 'result';
};

export type ChatTextResponse = {
  type: 'text';
  message: string;
};

export type ChatError = {
  type: 'error';
  message: string;
};

export type ChatTypes = ChatResult | ChatTextResponse | ChatError;

export type Result = {
  url: string;
  name: string;
  site: string;
  siteUrl: string;
  score?: number;
  description?: string;
  schema_object?: unknown;
  ranking_type?: string;
};

export type ResultBatch = {
  message_type: 'result_batch';
  results: Result[];
  query_id?: string;
};

export type ErrorResponse = {
  message_type: 'error';
  message: string;
};

export type SummarizeResponse = {
  message_type: 'summary';
  message: string;
};

export type NLWebNonStreamingResponse = Omit<ResultBatch, 'message_type'> & { error?: string };
export type NLWebResponses = ResultBatch | ErrorResponse | SummarizeResponse;

/**
 * Search options
 */
export interface SearchOptions {
  query?: string;
  site?: string | string[];
  generate_mode?: 'list' | 'summarize' | 'generate' | 'none';
  streaming?: boolean;
  prev?: string[];
  last_ans?: { title: string; url: string }[];
  item_to_remember?: string;
  model?: string;
  oauth_id?: string;
  thread_id?: string;
  display_mode?: 'full' | (string & {});
  signal?: AbortSignal;
}

/**
 * Chat options
 */
export interface ChatOptions {
  stream?: boolean;
  signal?: AbortSignal;
  generateMode?: GenerateMode;
}

/**
 * API error structure
 */
export interface ApiError {
  message: string;
  code?: string;
  status?: number;
  details?: Record<string, unknown>;
}

/**
 * Component lifecycle events
 */
export interface ComponentEvents {
  search: CustomEvent<{ query: string; results: SearchResult[] }>;
  error: CustomEvent<{ error: ApiError }>;
  ready: CustomEvent<void>;
  modeChange: CustomEvent<{ mode: ComponentMode }>;
}

/**
 * Request state
 */
export interface RequestState {
  id: string;
  controller: AbortController;
  timestamp: number;
}
