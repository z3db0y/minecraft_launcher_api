import { VersionMeta } from "api/types/versionmeta";
import match from "./ruleMatcher";

export default function parseMeta(metadata: VersionMeta): VersionMeta {
    if(metadata.minecraftArguments) {
        metadata.arguments = {
            game: metadata.minecraftArguments.split(' '),
            jvm: [
                "-Djava.library.path=${natives_directory}",
                "-cp",
                "${classpath}"
            ]
        };
        delete metadata.minecraftArguments;
    }

    let argTypes = ['game', 'jvm'];
    for(let t = 0; t < argTypes.length; t++) {
        if(metadata.arguments[argTypes[t]]) {
            let filtered = [...metadata.arguments[argTypes[t]]];
            for(let i = 0; i < metadata.arguments[argTypes[t]].length; i++) {
                let arg = metadata.arguments[argTypes[t]][i];
                if(typeof arg === 'string') continue;
                for(let j = 0; j < arg.rules.length; j++) {
                    if(
                        (!match(arg.rules[j], '*') && arg.rules[j].action === 'allow') ||
                        (match(arg.rules[j], '*') && arg.rules[j].action === 'disallow')
                    ) {
                        filtered.splice(filtered.indexOf(arg), 1);
                        break;
                    }
                }
            }
            metadata.arguments[argTypes[t]] = filtered;
        }
    }

    let filtered = [...metadata.libraries];
    for(let i = 0; i < metadata.libraries.length; i++) {
        let library = metadata.libraries[i];
        if(!library.rules) continue;

        for(let j = 0; j < library.rules.length; j++) {
            if(
                (!match(library.rules[j], '*') && library.rules[j].action === 'allow') ||
                (match(library.rules[j], '*') && library.rules[j].action === 'disallow')
            ) {
                filtered.splice(filtered.indexOf(library), 1);
                break;
            }
        }
    }
    metadata.libraries = filtered;

    return metadata;
}