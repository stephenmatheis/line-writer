/// <reference types="chrome" />

import { env, pipeline, TextStreamer, type TextGenerationPipeline } from '@huggingface/transformers';

// MV3 forbids remotely-hosted code: the extension bundles the ONNX runtime's
// own WASM binaries (see vite.config.ts's onnx-wasm copy step) rather than
// letting transformers.js fetch them from jsDelivr at runtime. Model
// *weights* (data, not code) still come from the HF CDN - that's fine, and
// cached by the browser after the first download. Only applies to the
// Chrome extension build; the plain-web/Safari build keeps the default.
if (typeof chrome !== 'undefined' && chrome.runtime?.id) {
    env.backends.onnx.wasm!.wasmPaths = chrome.runtime.getURL('onnx-wasm/');
}

const MODEL_ID = 'onnx-community/Qwen2.5-0.5B-Instruct';

export type Action = 'continue' | 'rewrite' | 'fix-grammar';

export type ToWorker = { type: 'generate'; id: string; action: Action; text: string } | { type: 'cancel'; id: string };

export type FromWorker =
    | { type: 'load-progress'; progress: number }
    | { type: 'model-ready' }
    | { type: 'model-error'; message: string }
    | { type: 'generate-chunk'; id: string; token: string }
    | { type: 'generate-done'; id: string }
    | { type: 'generate-error'; id: string; message: string }
    | { type: 'generate-cancelled'; id: string };

function post(message: FromWorker) {
    self.postMessage(message);
}

const SYSTEM_PROMPTS: Record<Action, string> = {
    continue:
        "Continue the user's writing directly from where it leaves off. Match their tone and style. Output only the continuation - no preamble, no quotes.",
    rewrite:
        'Rewrite the given text for clarity, keeping the original meaning and roughly the original length. Output only the rewritten text - no preamble, no quotes.',
    'fix-grammar':
        'Fix grammar and spelling only. Do not change the meaning, voice, or content. Output only the corrected text - no preamble, no quotes.',
};

const MAX_NEW_TOKENS: Record<Action, number> = {
    continue: 200,
    rewrite: 400,
    'fix-grammar': 400,
};

let pipelinePromise: Promise<TextGenerationPipeline> | null = null;
// tracks the single generation in flight so a `cancel` message (or a newer
// `generate` superseding it) can make the streamer stop early
let activeGenerationId: string | null = null;

function loadPipeline() {
    if (!pipelinePromise) {
        pipelinePromise = pipeline('text-generation', MODEL_ID, {
            dtype: 'q4',
            device: 'webgpu',
            progress_callback: (info) => {
                if (info.status === 'progress_total') {
                    post({ type: 'load-progress', progress: info.progress });
                }
            },
        })
            .catch(() =>
                pipeline('text-generation', MODEL_ID, {
                    dtype: 'q4',
                    device: 'wasm',
                    progress_callback: (info) => {
                        if (info.status === 'progress_total') {
                            post({ type: 'load-progress', progress: info.progress });
                        }
                    },
                }),
            )
            .then((loaded) => {
                post({ type: 'model-ready' });

                return loaded;
            });
    }

    return pipelinePromise;
}

async function generate(id: string, action: Action, text: string) {
    activeGenerationId = id;

    try {
        const generator = await loadPipeline();

        if (activeGenerationId !== id) {
            post({ type: 'generate-cancelled', id });

            return;
        }

        const streamer = new TextStreamer(generator.tokenizer, {
            skip_prompt: true,
            skip_special_tokens: true,
            callback_function: (chunk: string) => {
                if (activeGenerationId !== id) return;

                post({ type: 'generate-chunk', id, token: chunk });
            },
        });

        const messages = [
            { role: 'system', content: SYSTEM_PROMPTS[action] },
            { role: 'user', content: text },
        ];

        await generator(messages, {
            max_new_tokens: MAX_NEW_TOKENS[action],
            do_sample: false,
            streamer,
        });

        if (activeGenerationId === id) {
            post({ type: 'generate-done', id });
        } else {
            post({ type: 'generate-cancelled', id });
        }
    } catch (error) {
        post({ type: 'generate-error', id, message: error instanceof Error ? error.message : String(error) });
    } finally {
        if (activeGenerationId === id) {
            activeGenerationId = null;
        }
    }
}

self.onmessage = (event: MessageEvent<ToWorker>) => {
    const message = event.data;

    if (message.type === 'generate') {
        // the UI keeps the textarea readOnly during generation so this
        // shouldn't be reachable in practice, but the underlying pipeline
        // instance isn't safe to call concurrently - refuse rather than
        // silently interleave two generations against the same model
        if (activeGenerationId !== null) {
            post({ type: 'generate-error', id: message.id, message: 'A generation is already in progress.' });

            return;
        }

        void generate(message.id, message.action, message.text).catch((error) => {
            post({
                type: 'model-error',
                message: error instanceof Error ? error.message : String(error),
            });
        });

        return;
    }

    if (message.type === 'cancel') {
        // there's no mid-generate abort hook exposed by the streamer today;
        // flipping the id makes every subsequent chunk/done check above a
        // no-op and reports cancellation, which is enough for a v1 "stop"
        if (activeGenerationId === message.id) {
            activeGenerationId = null;
            post({ type: 'generate-cancelled', id: message.id });
        }
    }
};
