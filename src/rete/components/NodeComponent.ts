import type { Node } from '$rete/node/Node';
import { BaseComponent } from './BaseComponent';

export class NodeComponent extends BaseComponent {
	protected node: Node;
	constructor({ id, owner }: { id: string; owner: Node }) {
		super({ id: id, owner: owner });
		this.node = owner;
	}
}
