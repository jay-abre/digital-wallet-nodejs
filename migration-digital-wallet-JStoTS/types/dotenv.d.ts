declare module 'dotenv' {
    interface DotenvParseOutput {
        [key: string]: string;
    }

    interface DotenvConfigOptions {
        path?: string;
        encoding?: string;
        debug?: boolean;
    }

    interface DotenvConfigOutput {
        parsed?: DotenvParseOutput;
        error?: Error;
    }

    function config(options?: DotenvConfigOptions): DotenvConfigOutput;

    const dotenv: {
        config: typeof config;
    };

    export = dotenv;
}