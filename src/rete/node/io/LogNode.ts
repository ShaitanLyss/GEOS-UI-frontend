import { Input } from '../../Input';
import { Socket } from '../../socket/Socket';
import { Node } from '../Node';
import { notifications } from '@mantine/notifications';
import type { NodeFactory } from '../NodeFactory';
import { InputControl } from '$rete/control/Control';

export class LogNode extends Node {
	constructor({ message = 'Hello', factory }: { message?: string; factory: NodeFactory }) {
		// super('Log', { factory });
		super({ label: 'Log', factory, params: { message } });
		this.pythonComponent.addCode('print($(message))');
		this.pythonComponent.setCodeTemplateGetter(() => 
`
if (rank == 0):
    {this}
{exec}
`);
		this.height = 200;
		this.addInExec();
		this.addOutExec();

		const messageInput = new Input(new Socket(), 'Message');
		messageInput.addControl(new InputControl('text', { initial: message }));
		this.addInput('message', messageInput);
	}

	async execute(input: string, forward: (output: string) => unknown) {
		const messageControl = this.inputs.message?.control as ClassicPreset.InputControl<'text'>;

		const inputs = (await this.fetchInputs()) as {
			message: string[];
		};
		const res = inputs.message ? inputs.message[0] : messageControl.value;
		// console.log(res);

		notifications.show({ title: 'Log', message: res });

		forward('exec');
		super.execute(input, forward, false);
	}

	data() {
		return {};
	}
}
