import * as esbuild from 'esbuild';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import JavaScriptObfuscator from 'javascript-obfuscator';


if (!existsSync('dist')) {
    mkdirSync('dist');
}

const isWatch = process.argv.includes('--watch');
const skipObfuscate = process.argv.includes('--no-obfuscate');

const buildOptions = {
    entryPoints: ['js/app.js', 'js/admin.js'],
    bundle: true,
    outdir: 'dist',
    entryNames: '[name].bundle',
    format: 'iife',
    minify: !isWatch,
    sourcemap: isWatch,
    target: ['es2020'],
    logLevel: 'info'
};

if (isWatch) {
    const ctx = await esbuild.context(buildOptions);
    await ctx.watch();
    console.log('Watching for changes...');
} else {
    await esbuild.build(buildOptions);
    console.log('✓ Bundle created');

    
    if (!skipObfuscate) {
        console.log('⏳ Obfuscating...');
        const files = ['dist/app.bundle.js', 'dist/admin.bundle.js'];

        for (const file of files) {
            if (!existsSync(file)) continue;
            const code = readFileSync(file, 'utf8');

            const obfuscated = JavaScriptObfuscator.obfuscate(code, {
                compact: true,
                controlFlowFlattening: true,
                controlFlowFlatteningThreshold: 0.5,
                deadCodeInjection: false,
                debugProtection: false,
                identifierNamesGenerator: 'hexadecimal',
                renameGlobals: false,
                stringArray: true,
                stringArrayThreshold: 0.5,
                transformObjectKeys: true,
                unicodeEscapeSequence: false
            });

            writeFileSync(file, obfuscated.getObfuscatedCode());
        }
        console.log('✓ Build complete: dist/*.bundle.js (minified + obfuscated)');
    } else {
        console.log('✓ Build complete: dist/*.bundle.js (minified only)');
    }
}

