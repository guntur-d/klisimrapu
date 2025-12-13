import esbuild from 'esbuild';
import alias from 'esbuild-plugin-alias';
import path from 'path';

const isWatchMode = process.argv.includes('--watch');

const buildOptions = {
  entryPoints: ['src/index.js'],
  bundle: true,
  outfile: 'public/app.js',
  minify: true,
    loader: {
      '.js': 'jsx',
      '.svg': 'text',
    },
    resolveExtensions: ['.jsx', '.js', '.json', '.svg'],
    plugins: [
      alias({
        'remixicon/icons': path.resolve(process.cwd(), 'node_modules/remixicon/icons'),
      }),
    ],
};

if (isWatchMode) {
  esbuild.context(buildOptions).then(context => {
    context.watch();
  }).catch(() => process.exit(1));
} else {
  esbuild.build(buildOptions).catch(() => process.exit(1));
}