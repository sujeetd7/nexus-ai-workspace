
import { IKernel } from './kernel.interface';

export interface IKernelLifecycle {
  onStart(kernel: IKernel): Promise<void>;
  onStop(kernel: IKernel): Promise<void>;
}
