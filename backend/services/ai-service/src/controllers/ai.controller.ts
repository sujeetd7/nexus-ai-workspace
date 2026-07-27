import { Request, Response } from "express";

import { ExecuteAIDto } from "../dto/execute-ai.dto";
import { StreamEventType } from "../dto/stream-event.dto";

import { EmbeddingService } from "@services/embedding.service";
import { AIService } from "../services/ai.service";
import { ToolCallingService } from "../services/tool-calling.service";

export class AIController {
  private readonly service = new AIService();
  private readonly embeddingService = new EmbeddingService();
  private readonly toolCallingService = new ToolCallingService();

  execute = async (req: Request, res: Response) => {
    const dto = req.body as ExecuteAIDto;

    if (!dto?.prompt) {
      return res.status(400).json({
        code: "validation_error",
        message: "prompt is required",
      });
    }

    // Use tool calling service if tools are provided
    let result;
    if (dto.tools && dto.tools.length > 0) {
      result = await this.toolCallingService.executeWithTools(dto);
    } else {
      result = await this.service.execute(dto);
    }

    res.status(200).json(result);
  };

  stream = async (req: Request, res: Response) => {
    const dto = req.body as ExecuteAIDto;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // Use tool calling service for streaming if tools are provided
    const streamGenerator =
      dto.tools && dto.tools.length > 0
        ? this.toolCallingService.streamWithTools(dto)
        : this.service.stream(dto);

    for await (const event of streamGenerator) {
      res.write(`data: ${JSON.stringify(event)}\n\n`);

      if (event.type === StreamEventType.DONE) {
        break;
      }
    }

    res.end();
  };

  health = async (req: Request, res: Response) => {
    const provider = req.query.provider as string;

    const result = await this.service.health(provider);

    res.json(result);
  };

  chat = async (req: Request, res: Response) => {
    const { messages, ...options } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({
        code: "validation_error",
        message: "messages array is required",
      });
    }

    const result = await this.service.chat(messages, options);

    res.status(200).json(result);
  };

  streamChat = async (req: Request, res: Response) => {
    const { messages, ...options } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({
        code: "validation_error",
        message: "messages array is required",
      });
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    for await (const event of this.service.streamChat(messages, options)) {
      res.write(`data: ${JSON.stringify(event)}\n\n`);

      if (event.type === StreamEventType.DONE) {
        break;
      }
    }

    res.end();
  };

  embeddings = async (req: Request, res: Response) => {
    const { input, ...options } = req.body;

    if (!input) {
      return res.status(400).json({
        code: "validation_error",
        message: "input is required",
      });
    }

    const result = await this.service.embeddings(input, options);

    res.status(200).json(result);
  };

  providers = async (req: Request, res: Response) => {
    const providers = await this.service.getHealthyProviders();

    res.json({
      providers,
      total: providers.length,
    });
  };

  embed = async (req: Request, res: Response) => {
    if (!req.body?.provider) {
      return res.status(400).json({
        code: "validation_error",
        message: "provider is required",
      });
    }

    const result = await this.embeddingService.generate(req.body);

    res.status(200).json(result);
  };
}
