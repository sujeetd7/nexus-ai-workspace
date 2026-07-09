import { Request, Response } from "express";

import { ExecuteAIDto } from "../dto/execute-ai.dto";
import { StreamEventType } from "../dto/stream-event.dto";

import { AIService } from "../services/ai.service";

export class AIController {
  private readonly service = new AIService();

  execute = async (req: Request, res: Response) => {
    const dto = req.body as ExecuteAIDto;

    const result = await this.service.execute(dto);

    res.status(200).json(result);
  };

  stream = async (req: Request, res: Response) => {
    const dto = req.body as ExecuteAIDto;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    for await (const event of this.service.stream(dto)) {
      res.write(`data: ${JSON.stringify(event)}\n\n`);

      if (event.type === StreamEventType.DONE) {
        break;
      }
    }

    res.end();
  };

  health = async (req: Request, res: Response) => {
    const provider = (req.query.provider as string) ?? "ollama";

    const result = await this.service.health(provider);

    res.json(result);
  };
}
