import { Request, Response } from "express";
import { BenchmarkService } from "./benchmark.service";

export class BenchmarkController {
  private readonly service = new BenchmarkService();

  run = async (req: Request, res: Response) => {
    const dataset = req.body.dataset;
    if (!dataset) {
      res.status(400).json({ message: "A dataset payload is required." });
      return;
    }

    const executor = async (caseItem: {
      id: string;
      variables: Record<string, unknown>;
      expected?: unknown;
    }) => {
      const expected = caseItem.expected;
      const actual =
        req.body.executor?.(caseItem.variables) ?? caseItem.variables;
      const passed =
        expected === undefined
          ? true
          : JSON.stringify(actual) === JSON.stringify(expected);
      return {
        passed,
        score: passed ? 1 : 0,
        feedback: passed
          ? "Matched expected output."
          : "Output did not match expected value.",
      };
    };

    const result = await this.service.runDataset(dataset, executor);
    res.status(201).json(result);
  };

  list = async (_req: Request, res: Response) => {
    res.json(this.service.list());
  };

  get = async (req: Request, res: Response) => {
    const run = this.service.get(req.params.id as string);
    if (!run) {
      res.status(404).json({ message: "Benchmark run not found." });
      return;
    }
    res.json(run);
  };
}
