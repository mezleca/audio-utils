import { native } from "./lib/bindings";

export * from "./types/types";

let next_call_id = 1;

const get_call_id = () => {
    const current = next_call_id;
    next_call_id = (next_call_id + 1) >>> 0;

    if (next_call_id === 0) {
        next_call_id = 1;
    }

    return current;
};

const get_duration = (path: string) => {
    const call_id = get_call_id();
    const result = native.get_duration(call_id, path);

    if (result == null) {
        const error_message = native.get_last_error(call_id);
        if (error_message) {
            throw new Error(`libsndfile: ${error_message}`);
        }

        throw new Error("libsndfile: unknown error");
    }

    return result;
};

export { get_duration };
export default { get_duration };
