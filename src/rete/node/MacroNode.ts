import { GetGraphStore } from "$houdini";
import { Input, Node, NodeFactory, NodeEditor, Socket, Output, Connection } from "$rete";
import type { NodeEditorSaveData } from "$rete/NodeEditor";
import type { InputControl } from "$rete/control/Control";
import { ExecSocket } from "$rete/socket/ExecSocket";
import type { UUID } from "crypto";
import { DataflowEngine } from "rete-engine";
import type { Schemes } from "./Schemes";

class InputNode extends Node {
    private value: unknown;

    constructor({ factory }: { factory: NodeFactory }) {
        super({ factory});
        this.addOutData({
            name: "value",
        });
    }

    override data(inputs?: Record<string, unknown> | undefined): Record<string, unknown> {
        return { value: this.value };
    }

    setValue(val: unknown) {
        this.value = val;
        this.factory.dataflowEngine.reset(this.id);
    }
}

class OutExecNode extends Node {
    onExecute: () => void;

    constructor({ factory, onExecute}: { factory: NodeFactory, onExecute: () => void }) {
        super({ factory });
        this.onExecute = onExecute;
        this.addInExec();
    }

    override execute(input: string, forward: (output: string) => unknown): void {
        this.onExecute();
        super.execute(input, forward);
    }
}


        

export class MacroNode extends Node {

    readonly macroEditor: NodeEditor;
    readonly macroFactory: NodeFactory;
    private inputNodes: Record<string, InputNode> = {};
    forward?: (output: string) => unknown;

    graphId: UUID;

    constructor({ factory, saveData, graphId }: { factory: NodeFactory, saveData: NodeEditorSaveData, graphId: UUID }) {
        super({ factory, params: { saveData, graphId }, height: 25 });
        this.graphId = graphId;
        this.macroEditor = new NodeEditor()
        this.macroFactory = new NodeFactory({ editor: this.macroEditor, makutuClasses: factory.makutuClasses })
        let numSockets = 0;
        for (const node of saveData.nodes) {
            numSockets += node.selectedInputs.length + node.selectedOutputs.length;
        }
        this.height += numSockets * 55;

        this.initializePromise = this.initialize({ graphId, saveData })
        this.onRemoveIngoingConnection = (conn: Connection) => {
            const macroKey = conn.targetInput;
            const inputNode = this.inputNodes[macroKey];
            if (!inputNode) throw new Error("Input node not found for " + macroKey);
            
            inputNode.setValue(this.getData(macroKey));
        }
        // this.afterInitialize = () => {
        //     console.log("MacroNode.afterInitialize")
        //     let numSockets = 0;
        //     for (const node of this.macroEditor.getNodes()) {
        //         numSockets += Object.keys(node.socketSelectionComponent.selectedInputs()).length + Object.keys(node.socketSelectionComponent.selectedOutputs()).length;
        //     }
        //     this.height += numSockets * 55;
        //     this.updateElement();
        // }

    }

    async initialize(params: { graphId: UUID, saveData: NodeEditorSaveData }): Promise<void> {
        const { saveData } = params;
        // const data = (await new GetGraphStore().fetch({ variables: { id: graphId } })).data?.graph.data;
        // if (data === undefined) throw new Error("Graph not found : " + graphId);
        // const saveData: NodeEditorSaveData = JSON.parse(data);
        this.label = saveData.editorName;
        await this.macroFactory.loadGraph(saveData);
        for (const node of this.macroEditor.getNodes()) {
            for (const [key, input] of Object.entries(node.socketSelectionComponent.selectedInputs())) {
                const macroKey = key + "-" + node.id;
                if (input.socket instanceof ExecSocket) {
                    this.addInExec(macroKey, input.socket.name)
                    continue;
                }

                const inputNode = await this.macroFactory.addNode(InputNode, {});
                if (!inputNode) throw new Error("Failed to add input node " + macroKey);
                await this.macroEditor.addNewConnection(inputNode, "value", node, key);
                this.inputNodes[macroKey] = inputNode;


                const baseInputControl = input.control as InputControl<"text">;
                
                const macroInput = this.addInData({
                    name: macroKey,
                    displayName: input.socket.name,
                    type: input.socket.type,
                    isArray: input.socket.isArray,
                    isRequired: input.socket.isRequired,
                    socketLabel: input.socket.name,
                    control: {
                        type: baseInputControl.type,
                        options: {
                            ...baseInputControl.options,
                            debouncedOnChange: async (val: unknown) => {
                                inputNode.setValue(val);
                            }
                        }

                    }
                })
                
            }
            for (const [microKey, output] of Object.entries(node.socketSelectionComponent.selectedOutputs())) {
                const macroKey = microKey + "-" + node.id;
                if (output.socket instanceof ExecSocket) {
                    this.addOutExec(macroKey, output.socket.name)
                    const execNode = await this.macroFactory.addNode(OutExecNode, { onExecute: () => {
                        if (macroKey in this.outgoingExecConnections) {
                            const conn = this.outgoingExecConnections[macroKey];
                            if (!this.forward) throw new Error("Forward not set");
                            this.factory.getControlFlowEngine().execute(conn.target, conn.targetInput)
                        }
                        // this.execute(macroKey, () => {});
                    }})
                    
                    await this.macroEditor.addNewConnection(node, microKey ,execNode, 'exec' )

                    continue;
                }
                this.addOutput(macroKey, new Output(new (output.socket.constructor as typeof Socket)({

                    ...output.socket,
                    node: this,
                })))
            }
        }
        this.updateElement();
    }

    override execute(input: string, forward: (output: string) => unknown): void {
        this.forward = forward;
        const [key, nodeId] = input.split("-");
        this.macroFactory.getControlFlowEngine().execute(nodeId, key)
        super.execute(input, forward, false);
    }

    override async data(inputs: Record<string, unknown[]>): Promise<Record<string, unknown>> {
        console.log(inputs);
        for (const [macroKey, input] of Object.entries(inputs)) {
            const [microKey, nodeId] = macroKey.split("-");
            this.inputNodes[macroKey].setValue(input.length <= 1 ? input[0] : input);
        }

        const res: Record<string, unknown> = {};
        try {
        for (const outputKey of Object.keys(this.outputs)) {
            const [microOutputKey, nodeId] = outputKey.split("-");
            const microRes = await this.macroFactory.dataflowEngine.fetch(nodeId);
            res[outputKey] = microRes[microOutputKey];
        }
    } catch (e) {
    }
        console.log('MacroNode.data', res)
        return res;
    }

}