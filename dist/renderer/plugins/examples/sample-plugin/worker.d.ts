/**
 * Sample Plugin Worker
 * Example implementation of an Regen plugin
 */
import { OBHost, OBPlugin } from '../../shared/api';
declare class SamplePlugin implements OBPlugin {
    private host;
    init(host: OBHost): Promise<void>;
    dispose(): Promise<void>;
}
export default SamplePlugin;
