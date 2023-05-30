import { ReactRenderPlugin } from 'rete-react-render-plugin';
import type { Schemes } from '../node/Schemes';
import type { AreaExtra } from '../node/AreaExtra';
import { Presets } from 'rete-react-render-plugin';
import type { AreaPlugin } from 'rete-area-plugin';
import { createRoot } from 'react-dom/client';
import type { NodeEditor } from 'rete';
import { CustomArraySocket } from './CustomArraySocket';
import { Socket } from '../socket/Socket';
import { CustomClassicSocket } from './CustomClassicSocket';
import { CustomExecSocket } from './CustomExecSocket';

const render = new ReactRenderPlugin<Schemes, AreaExtra>({ createRoot });

const controlCustomization = [];

export function addCustomization(type: 'socket' | 'control', customize) {
	switch (type) {
		case 'socket':
			console.log('chaussette');
			break;
		case 'control':
			controlCustomization.push(customize);

			break;
	}
}

export function setupRender(editor: NodeEditor<Schemes>, area: AreaPlugin<Schemes, AreaExtra>) {
	render.addPreset(
		Presets.classic.setup({
			customize: {
				socket(context) {
					if (context.payload instanceof Socket) {
						if (context.payload.type === 'exec') return CustomExecSocket;
						return context.payload.isArray ? CustomArraySocket : CustomClassicSocket;
					}

					return Presets.classic.Socket;
				},
				control(data) {
					for (const customization of controlCustomization) {
						let customizationResult;
						if ((customizationResult = customization(data))) {
							return customizationResult;
						}
					}
					return Presets.classic.Control;
				}
			}
		})
	);

	render.addPreset(Presets.contextMenu.setup({ delay: 50 }));
	render.addPreset(Presets.minimap.setup({ size: 200 }));

	area.use(render);
}
