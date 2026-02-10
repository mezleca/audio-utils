import path from "path";
import audioutil from "../src/index";

(() => {
    console.log(audioutil.get_duration(path.resolve(process.cwd(), "scripts", "audio.mp3")));
})();
