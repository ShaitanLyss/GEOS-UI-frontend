import { ButtonControl } from '../../control/button/button';
import { AddPinNode } from '../AddPinNode';
import { NodeFactory } from '../NodeFactory';
import { getLeavesFromOutput } from '../utils';

export class SequenceNode extends AddPinNode {

	constructor({ factory }: { factory: NodeFactory }) {
		super({ label: 'Sequence', factory, height: 126, numPins:2 });
		this.addInExec();
	}

	override onAddPin(index: number) {		
		const newPinId = index;
		this.addOutExec('exec-' + index, newPinId.toString());
		this.height += 47;
		this.updateElement('node', this.id);
	}
	override async execute(input: string, forward: (output: string) => unknown): Promise<void> {
		for (const key in this.outputs) {
			const promises = this.getWaitPromises(getLeavesFromOutput(this, key));
			forward(key);
			await Promise.all(promises);
		}
		super.execute(input, forward, false);
	}
}
