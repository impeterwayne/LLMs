/**
 * GeminiProcessor — Runs synthesis prompts through the Gemini CLI.
 *
 * Spawns `gemini` via child_process, pipes the prompt to stdin,
 * captures stdout/stderr, and forwards output to a renderer window.
 */
import { spawn } from "node:child_process";
import os from "os";

export interface GeminiProcessorCallbacks {
    onOutput: (data: string) => void;
    onError: (data: string) => void;
    onDone: (code: number | null) => void;
}

export class GeminiProcessor {
    private running = false;

    get isRunning(): boolean {
        return this.running;
    }

    /**
     * Send a prompt to the Gemini CLI and stream the output.
     * Optionally attach files via @file references in the CLI args.
     * Returns a promise that resolves when the process exits.
     */
    async run(
        prompt: string,
        callbacks: GeminiProcessorCallbacks,
        files?: string[]
    ): Promise<void> {
        if (this.running) {
            callbacks.onError("[GeminiProcessor] Already processing a request\n");
            return;
        }

        this.running = true;

        return new Promise<void>((resolve) => {
            // On Windows, use cmd.exe to run gemini via PATH.
            // On other platforms, use /bin/sh.
            const isWin = os.platform() === "win32";
            const shell = isWin ? "cmd.exe" : "/bin/sh";

            // Build the gemini command with optional @file arguments
            let geminiCmd = "gemini";
            if (files && files.length > 0) {
                // Append @file references so Gemini CLI reads them as context
                const fileRefs = files.map(f => `@"${f.replace(/"/g, '\\"')}"`).join(" ");
                geminiCmd = `gemini ${fileRefs}`;
            }

            const args = isWin ? ["/c", geminiCmd] : ["-c", geminiCmd];

            const proc = spawn(shell, args, {
                // Run from temp dir to prevent Gemini CLI from reading project files
                cwd: os.tmpdir(),
                stdio: ["pipe", "pipe", "pipe"],
                env: {
                    ...process.env,
                    GEMINI_CLI_MODE: "cli",
                },
                windowsHide: true,
            });

            proc.stdout?.on("data", (chunk: Buffer) => {
                const text = chunk.toString();
                console.log(`[Gemini stdout] ${text.substring(0, 200)}${text.length > 200 ? '...' : ''}`);
                callbacks.onOutput(text);
            });

            proc.stderr?.on("data", (chunk: Buffer) => {
                const text = chunk.toString();
                // Filter out known noise completely
                if (
                    /loaded cached credentials/i.test(text) ||
                    /IDE.*companion.*extension/i.test(text)
                ) {
                    return; // Skip noise entirely
                }
                console.log(`[Gemini stderr] ${text.trim()}`);
                callbacks.onError(text);
            });

            proc.on("close", (code) => {
                this.running = false;
                callbacks.onDone(code);
                resolve();
            });

            proc.on("error", (err) => {
                this.running = false;
                callbacks.onError(`[GeminiProcessor] Spawn error: ${err.message}\n`);
                callbacks.onDone(1);
                resolve();
            });

            // Write the prompt to stdin and close it to signal EOF
            if (proc.stdin) {
                proc.stdin.write(prompt);
                proc.stdin.end();
            }
        });
    }
}
