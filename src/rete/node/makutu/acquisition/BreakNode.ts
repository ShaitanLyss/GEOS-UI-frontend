import { PythonObject, PythonProperty } from '../../../../backend-interaction/python';
import { Node } from '../../Node';
import type { NodeFactory } from '../../NodeFactory';

// TODO : autogenerate outputs from the python object
export class BreakNode extends Node {
	constructor({ factory }: { factory: NodeFactory }) {
		super({ label: 'Break Shot', factory, height: 225 });
		this.addInData({
			name: 'object',
			displayName: 'Shot',
			socketLabel: 'Shot',
			type: 'pythonObject'
		});

		this.addOutData({
			name: 'xml',
			displayName: 'XML',
			type: 'pythonProperty'
		});

		this.addOutData({
			name: 'sourceCoords',
			displayName: 'Source Coords',
			type: 'pythonProperty'
		});
		this.addOutData({
			name: 'receiverCoords',
			displayName: 'Receiver Coords',
			type: 'pythonProperty'
		});

		this.addOutData({
			name: 'id',
			displayName: 'ID',
			type: 'pythonProperty'
		});

		this.pythonComponent.setDataCodeGetter("xml", () => "$(object).xml");
		this.pythonComponent.setDataCodeGetter("sourceCoords", () => "$(object).sourcesCoords");
		this.pythonComponent.setDataCodeGetter("receiverCoords", () => "$(object).receiverCoords");
		this.pythonComponent.setDataCodeGetter("id", () => "$(object).id");

	}

	data(
		inputs?: Record<string, unknown> | undefined
	): Record<string, unknown> | Promise<Record<string, unknown>> {
		const res = {
			xml: undefined,
			sourceCoords: undefined,
			receiverCoords: undefined,
			id: undefined
		};
		if (!inputs) return { ...super.data(inputs), res };
		const object = inputs.object as PythonObject;
		if (!object) return { ...super.data(inputs), res };

		return {
			...super.data(inputs),
			xml: new PythonProperty(object, 'xml'),
			sourceCoords: new PythonProperty(object, 'sourcesCoords'),
			receiverCoords: new PythonProperty(object, 'receiverCoords'),
			id: new PythonProperty(object, 'id')
		};
	}
}
