
import { IKernel } from './kernel.interface';

export interface IKernelModule {
  name: string;
  init(kernel: IKernel): Promise<void>;
  dispose(): Promise<void>;
  // Modules can expose specific APIs or services here
}
