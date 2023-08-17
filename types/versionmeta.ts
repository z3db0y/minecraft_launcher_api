export interface Rule {
    action: 'allow' | 'disallow';
    features?: {
        is_demo_user?: boolean;
        has_custom_resolution?: boolean;
        has_quick_plays_support?: boolean;
        is_quick_play_singleplayer?: boolean;
        is_quick_play_multiplayer?: boolean;
        is_quick_play_realms?: boolean;
    };
    os?: {
        name?: 'windows' | 'osx' | 'linux';
        arch?: 'x86' | 'x64';
        version?: string;
    }
}

export interface Argument {
    value: string | string[];
    rules: Rule[];
}

export interface Download {
    size: number;
    sha1: string;
    url: string;
}

export interface Artifact {
    path: string;
    sha1: string;
    size: number;
    url: string;
}

export interface Library {
    downloads: {
        artifact?: Artifact;
        classifiers?: {
            [key: string]: Artifact;
        };
    };
    name: string;
    rules?: Rule[];
    natives?: {
        linux: string;
        osx: string;
        windows: string;
    }
}

export interface VersionMeta {
    arguments?: {
        game?: (string | Argument)[];
        jvm?: (string | Argument)[];
    };
    assetIndex: {
        id: string;
        sha1: string;
        size: number;
        totalSize: number;
        url: string;
    };
    assets: string;
    complianceLevel: number;
    downloads: {
        client: Download,
        client_mappings?: Download,
        server: Download,
        server_mappings?: Download,
        windows_server?: Download
    };
    id: string;
    javaVersion: {
        component: string;
        majorVersion: number;
    };
    libraries: Library[];
    mainClass: string;
    minecraftArguments?: string;
}

export interface VersionList {
    latest: {
        release: string;
        snapshot: string;
    }
    versions: {
        id: string;
        type: 'release' | 'snapshot';
        url: string;
        time: string;
        releaseDate: string;
    }[];
}

export interface AssetInfo {
    objects: {
        [key: string]: {
            hash: string;
            size: number;
        }
    };
}