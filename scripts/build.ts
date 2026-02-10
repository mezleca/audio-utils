import fs from "fs";
import path from "path";

const TARGET_DIR = "build";
const TMP_NATIVE = path.join(TARGET_DIR, "native-tmp");

const execute_raw = async (bin_name: string, arg_list: string[]) => {
    const full_cmd = `${bin_name} ${arg_list.join(" ")}`;
    console.log(`\nexecuting: ${full_cmd}`);

    const proc = Bun.spawn({
        cmd: [bin_name, ...arg_list],
        stdout: "inherit",
        stderr: "inherit",
        env: { ...process.env },
    });

    const exit_code = await proc.exited;
    if (exit_code !== 0) {
        process.exit(1);
    }
};

const execute_capture = async (bin_name: string, arg_list: string[]) => {
    const full_cmd = `${bin_name} ${arg_list.join(" ")}`;
    console.log(`\nexecuting: ${full_cmd}`);

    const proc = Bun.spawn({
        cmd: [bin_name, ...arg_list],
        stdout: "pipe",
        stderr: "inherit",
        env: { ...process.env },
    });

    const output = await new Response(proc.stdout).text();
    const exit_code = await proc.exited;
    if (exit_code !== 0) {
        process.exit(1);
    }

    return output.trim();
};

const remove_dir = (dir_path: string) => {
    if (fs.existsSync(dir_path)) {
        try {
            fs.rmSync(dir_path, { recursive: true, force: true });
        } catch (e: any) {
            console.warn(`[warn] could not remove ${dir_path}: ${e.message}`);
        }
    }
};

const compile_native = async () => {
    const cmake_args = ["build", "-G", "Ninja", "--out", TMP_NATIVE];

    if (process.platform === "win32" && !process.env.CMAKE_TOOLCHAIN_FILE) {
        console.error("missing CMAKE_TOOLCHAIN_FILE (vcpkg toolchain).");
        process.exit(1);
    }

    if (process.env.CI) {
        remove_dir(TMP_NATIVE);
    }

    await execute_raw("cmake-js", cmake_args);

    const BIN_NAMES = [path.join(TMP_NATIVE, "audio-utils.node"), path.join(TMP_NATIVE, "Release", "audio-utils.node")];

    for (const bin_file of BIN_NAMES) {
        if (fs.existsSync(bin_file)) {
            // copy to build/
            fs.copyFileSync(bin_file, path.join(TARGET_DIR, "audio-utils.node"));

            // copy to prebuilds for node-gyp-build
            const platform = process.platform;
            const arch = process.arch;
            const prebuilds_dir = path.join("prebuilds", `${platform}-${arch}`);

            if (!fs.existsSync(prebuilds_dir)) {
                fs.mkdirSync(prebuilds_dir, { recursive: true });
            }

            fs.copyFileSync(bin_file, path.join(prebuilds_dir, "audio-utils.node"));

            console.log(`\ncopied binary to ${prebuilds_dir}`);
            return;
        }
    }

    process.exit(1);
};

const run_ci = async () => {
    await execute_raw("gh", ["workflow", "run", "release", "-f", "mode=build_only"]);
    const run_json = await execute_capture("gh", ["run", "list", "--workflow", "release", "--limit", "1", "--json", "databaseId,status,conclusion"]);
    let run_id = "";

    try {
        const parsed = JSON.parse(run_json);
        if (Array.isArray(parsed) && parsed.length > 0) {
            run_id = String(parsed[0].databaseId);
        }
    } catch {
        run_id = "";
    }

    if (!run_id) {
        console.error("failed to resolve workflow run id");
        process.exit(1);
    }

    await execute_raw("gh", ["run", "watch", run_id, "--exit-status"]);
};

const main = async () => {
    const EXEC_ARGS = process.argv.slice(2);

    if (fs.existsSync(TARGET_DIR) == false) {
        fs.mkdirSync(TARGET_DIR);
    }

    if (EXEC_ARGS.includes("native")) {
        if (EXEC_ARGS.includes("clean")) remove_dir(TARGET_DIR);
        await compile_native();
    }

    if (EXEC_ARGS.includes("ci")) {
        await run_ci();
    }
};

await main();
