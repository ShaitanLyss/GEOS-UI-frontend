import { ClassicPreset } from 'rete';
import type { Socket } from './socket/Socket';

export class Output<S extends Socket> extends ClassicPreset.Output<S> {}
