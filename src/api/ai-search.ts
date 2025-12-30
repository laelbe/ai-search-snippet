/**
 * NLWeb API Client
 * Handles all API communication with retry logic, streaming support, and request cancellation
 */

import type {
  ChatTextResponse,
  ChatTypes,
  SearchError,
  SearchOptions,
  SearchResult,
} from '../types/index.ts';
import { Client } from './index.ts';

export class AISearchClient extends Client {
  private request(
    options: SearchOptions = {},
    operation: 'ai-search' | 'search' | 'chat/completions',
    signal?: AbortSignal
  ): Promise<Response> {
    return fetch(`${this.baseUrl}/${operation}`, {
      method: 'POST',
      body: JSON.stringify(
        operation === 'ai-search' || operation === 'search'
          ? {
              query: options.query,
              stream: options.streaming,
            }
          : {
              // model: 'workers-ai/@cf/meta/llama-3.3-70b-instruct-fp8-fast',
              messages: [{ role: 'user', content: options.query }],
            }
      ),
      headers: {
        'Content-Type': 'application/json',
      },
      signal,
    });
  }

  /**
   * Performs a search query with optional streaming
   */
  async search(query: string, options: Omit<SearchOptions, 'query'> = {}): Promise<SearchResult[]> {
    const requestId = this.generateRequestId();
    const controller = new AbortController();
    const signal = options.signal || controller.signal;

    this.registerRequest(requestId, controller);

    try {
      const response = await this.request(
        {
          query,
          streaming: false,
          generate_mode: options.generate_mode,
          site: options.site,
          prev: options.prev,
          last_ans: options.last_ans,
          item_to_remember: options.item_to_remember,
          model: options.model,
          oauth_id: options.oauth_id,
          thread_id: options.thread_id,
          display_mode: options.display_mode,
        } satisfies SearchOptions,
        'search',
        signal
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (!response.body) {
        throw new Error('Response body is empty');
      }
      const result: {
        success: boolean;
        result: {
          data: {
            file_id: string;
            filename: string;
            score: number;
            attributes: {
              timestamp: number;
              folder: string;
              filename: string;
              file: {
                description: string;
                image: string;
                title: string;
              };
            };
            content: [
              {
                id: string;
                type: string;
                text: string;
              },
            ];
          }[];
        };
      } = await response.json();
      if (result.success && result.result) {
        return result.result.data.map((item) => ({
          type: 'result',
          id: item.file_id,
          title: item.attributes.file.title,
          description: item.attributes.file.description,
          url: item.filename,
          metadata: item.attributes,
        }));
      }
      if (result.success === false) {
        // @ts-expect-error need to check this
        throw new Error(result.error);
      }
      throw new Error('Unknown error');
    } finally {
      this.unregisterRequest(requestId);
    }
  }

  async *searchStream(
    query: string,
    options?: SearchOptions
  ): AsyncGenerator<SearchResult | SearchError, void, undefined> {
    const requestId = this.generateRequestId();
    const controller = new AbortController();
    const signal = options?.signal || controller.signal;

    this.registerRequest(requestId, controller);

    const response = await this.request(
      {
        query,
        streaming: true,
        generate_mode: options?.generate_mode,
        site: options?.site,
        prev: options?.prev,
        last_ans: options?.last_ans,
        item_to_remember: options?.item_to_remember,
        model: options?.model,
        oauth_id: options?.oauth_id,
        thread_id: options?.thread_id,
        display_mode: options?.display_mode,
      } satisfies SearchOptions,
      'ai-search',
      signal
    );
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    if (!response.body) {
      throw new Error('Response body is empty');
    }

    let chunks = '';
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      const chunk = decoder.decode(value, { stream: true });
      chunks += chunk;
    }

    const result: string = chunks
      .replaceAll('data: ', '')
      .trim()
      .split('\n\n')
      .map((chunk) => {
        return JSON.parse(chunk) as { response: string };
      })
      .map((chunk) => chunk.response)
      .join('');

    yield {
      type: 'result',
      id: '',
      title: '',
      description: result,
      url: '',
      metadata: {},
    };
  }

  async *chat(query: string, options?: SearchOptions): AsyncGenerator<ChatTypes, void, undefined> {
    const controller = new AbortController();
    const signal = options?.signal || controller.signal;
    // const prevQueries: string[] = JSON.parse(localStorage.getItem('prevQueries') || '[]');
    // prevQueries.push(query);
    // localStorage.setItem('prevQueries', JSON.stringify(prevQueries));
    const response = await this.request(
      {
        query,
        streaming: false,
      } satisfies SearchOptions,
      'chat/completions',
      signal
    );
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    if (!response.body) {
      throw new Error('Response body is empty');
    }
    const result = (await response.json()) as {
      choices: {
        message: {
          content: string;
        };
      }[];
    };

    yield {
      type: 'text',
      message: result.choices.map((choice) => choice.message.content).join(''),
    } satisfies ChatTextResponse;

    // for (const item of result.data) {
    //   yield {
    //     type: 'result',
    //     id: item.filename,
    //     title: item.filename,
    //     description: item.content.text,
    //     url: item.filename,
    //     metadata: item.attributes
    //     ,
    //   } satisfies ChatResult;
    // }

    return;
  }

  /**
   * Cancels an active request by ID
   */
  cancelRequest(requestId: string): void {
    const request = this.activeRequests.get(requestId);
    if (request) {
      request.controller.abort();
      this.unregisterRequest(requestId);
    }
  }

  /**
   * Cancels all active requests
   */
  cancelAllRequests(): void {
    for (const [requestId] of this.activeRequests) {
      this.cancelRequest(requestId);
    }
  }

  /**
   * Register an active request
   */
  private registerRequest(id: string, controller: AbortController): void {
    this.activeRequests.set(id, {
      id,
      controller,
      timestamp: Date.now(),
    });
  }

  /**
   * Unregister a completed request
   */
  private unregisterRequest(id: string): void {
    this.activeRequests.delete(id);
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
