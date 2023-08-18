import { StdioOptions, spawn } from "child_process"
import { Argument, VersionMeta } from "./types/versionmeta";
import match from "./ruleMatcher";

function startJVM(javaPath: string, jvmArgs: string[], mainClass: string, args: string[], cwd?: string, env?: any, stdio?: StdioOptions) {
    return spawn(javaPath, [
        ...jvmArgs,
        mainClass,
        ...args
    ], {
        cwd,
        env,
        stdio
    });
}

export type Feature = 'is_demo_user' | 'has_custom_resolution' | 'has_quick_plays_support' | 'is_quick_play_singleplayer' | 'is_quick_play_multiplayer' | 'is_quick_play_realms';

export interface LaunchParams {
    auth_player_name: string;
    version_name: string;
    game_directory: string;
    assets_root: string;
    assets_index_name: string;
    auth_uuid: string;
    auth_access_token?: string;
    clientid?: string;
    auth_xuid?: string;
    user_type?: string;
    version_type?: string;
    quickPlaySingleplayer?: string;
    quickPlayMutliplayer?: string;
    quickPlayRealms?: string;
    quickPlayPath?: string;
    resolution_width?: string;
    resolution_height?: string;
    natives_directory: string;
    launcher_name?: string;
    launcher_version?: string;
    classpath: string;
}

function argFilter(args: (string | Argument)[], params: LaunchParams, features: Feature[]) {
    let newArgs = [];
    for(let i = 0; i < args.length; i++) {
        let arg = args[i];
        if(typeof arg === 'string') {
            newArgs.push(arg.format(params));
        } else {
            let matched = true;
            for(let j = 0; j < arg.rules.length; j++) {
                let rule = arg.rules[j];
                if(
                    (rule.action === 'allow' && !match(rule, features)) ||
                    (rule.action === 'disallow' && match(rule, features))
                ) {
                    matched = false;
                    break;
                }
            }

            if(matched) {
                if(Array.isArray(arg.value)) {
                    for(let j = 0; j < arg.value.length; j++) newArgs.push(arg.value[j].format(params));
                } else newArgs.push(arg.value.format(params));
            }
        }
    }
    return newArgs;
}

export default function launch(javaPath: string, meta: VersionMeta, params: LaunchParams, features: Feature[]) {
    (params as any).classPath = params.classpath;
    return startJVM(
        javaPath,
        argFilter(meta.arguments.jvm, params, features),
        meta.mainClass,
        argFilter(meta.arguments.game, params, features)
    );
}