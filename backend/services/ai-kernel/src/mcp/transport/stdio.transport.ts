import { spawn, ChildProcess } from "child_process";
import { BaseTransport } from "./base.transport";
import { MCPTransportConfig, MCPTransportMessage } from "./transport.interface";

export interface STDIOTransportConfig extends MCPTransportConfig {
  command: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number;
}

export class STDIOTransport extends BaseTransport {
  private process: ChildProcess | null = null;
  private config: STDIOTransportConfig | null = null;
  private messageBuffer: string = "";

  constructor(id: string) {
    super(id, "stdio");
  }

  async connect(config: STDIOTransportConfig): Promise<void> {
    if (this._connected) {
      throw new Error("Already connected");
    }

    this.config = {
      timeout: 30000,
      ...config
    };

    return new Promise((resolve, reject) => {
      try {
        this.process = spawn(this.config!.command, this.config!.args || [], {
          cwd: this.config!.cwd,
          env: { ...process.env, ...this.config!.env },
          stdio: ["pipe", "pipe", "pipe"]
        });

        this.process.on("error", (error) => {
          this.handleError(error);
          reject(new Error(`Failed to spawn process: ${error.message}`));
        });

        this.process.on("exit", (code, signal) => {
          this.handleDisconnect();
          if (code !== 0 && code !== null) {
            this.handleError(new Error(`Process exited with code ${code}`));
          }
        });

        this.process.stdout!.on("data", (data) => {
          this.handleStdoutData(data);
        });

        this.process.stderr!.on("data", (data) => {
          this.handleError(new Error(`Process stderr: ${data.toString()}`));
        });

        // Send initialization message
        const initMessage: MCPTransportMessage = {
          id: this.generateRequestId(),
          method: "initialize",
          params: { clientInfo: { name: "nexus-ai", version: "1.0.0" } },
          jsonrpc: "2.0"
        };

        this.sendMessage(initMessage);

        // Wait for initialization response
        const timeout = setTimeout(() => {
          reject(new Error("Initialization timeout"));
        }, this.config!.timeout);

        const handleInit = (message: MCPTransportMessage) => {
          if (message.id === initMessage.id) {
            clearTimeout(timeout);
            this.removeListener("message", handleInit);
            if (message.error) {
              reject(new Error(`Initialization failed: ${message.error.message}`));
            } else {
              this.handleConnect();
              resolve();
            }
          }
        };

        this.on("message", handleInit);
      } catch (error) {
        reject(error);
      }
    });
  }

  async disconnect(): Promise<void> {
    if (!this._connected || !this.process) {
      return;
    }

    return new Promise((resolve) => {
      if (this.process) {
        this.process.on("exit", () => {
          this.process = null;
          this.config = null;
          this.messageBuffer = "";
          resolve();
        });

        // Send graceful shutdown
        try {
          const shutdownMessage: MCPTransportMessage = {
            id: this.generateRequestId(),
            method: "shutdown",
            params: {},
            jsonrpc: "2.0"
          };
          this.sendMessage(shutdownMessage);
        } catch (e) {
          // Ignore errors during shutdown
        }

        // Force kill after timeout
        setTimeout(() => {
          if (this.process && !this.process.killed) {
            this.process.kill("SIGKILL");
          }
        }, 5000);

        this.process.kill("SIGTERM");
      } else {
        resolve();
      }
    });
  }

  async send(message: MCPTransportMessage): Promise<void> {
    if (!this._connected || !this.process) {
      throw new Error("Transport not connected");
    }

    this.sendMessage(message);
  }

  async *stream(method: string, params?: any): AsyncIterable<any> {
    if (!this._connected) {
      throw new Error("Transport not connected");
    }

    const streamId = this.generateRequestId();
    const message: MCPTransportMessage = {
      id: streamId,
      method,
      params,
      jsonrpc: "2.0"
    };

    const results: any[] = [];
    let finished = false;

    const handleStreamMessage = (msg: MCPTransportMessage) => {
      if (msg.id === streamId) {
        if (msg.error) {
          finished = true;
          throw new Error(`Stream error: ${msg.error.message}`);
        }
        if (msg.result?.done) {
          finished = true;
        } else if (msg.result?.data) {
          results.push(msg.result.data);
        }
      }
    };

    this.on("message", handleStreamMessage);
    this.sendMessage(message);

    try {
      while (!finished) {
        if (results.length > 0) {
          yield results.shift();
        } else {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }

      // Yield any remaining results
      while (results.length > 0) {
        yield results.shift();
      }
    } finally {
      this.off("message", handleStreamMessage);
    }
  }

  async close(): Promise<void> {
    await this.disconnect();
  }

  private sendMessage(message: MCPTransportMessage): void {
    if (!this.process || !this.process.stdin) {
      throw new Error("Process stdin not available");
    }

    const json = JSON.stringify(message) + "\n";
    this.process.stdin.write(json);
  }

  private handleStdoutData(data: Buffer): void {
    this.messageBuffer += data.toString();
    
    const lines = this.messageBuffer.split("\n");
    this.messageBuffer = lines.pop() || "";

    for (const line of lines) {
      if (line.trim()) {
        try {
          const message: MCPTransportMessage = JSON.parse(line);
          this.handleMessage(message);
        } catch (error) {
          this.handleError(new Error(`Invalid JSON received: ${line}`));
        }
      }
    }
  }
}