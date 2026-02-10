import nodeGypBuild from "node-gyp-build";
import path from "path";

import { INativeAudio } from "../types/types";

const native = nodeGypBuild(path.join(__dirname, "..", "..")) as INativeAudio;

export { native };
