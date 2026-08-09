import nodeResolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import babel from '@rollup/plugin-babel';
import serve from 'rollup-plugin-serve';

export default {
  input: ['src/platinum-weather-card.ts'],
  output: {
    dir: './dist',
    format: 'es',
    inlineDynamicImports: true,
    sourcemap: true,
  },
  watch: {
    include: './src/**',
    clearScreen: false,
  },
  plugins: [
    nodeResolve({
      browser: true,
      preferBuiltins: false,
    }),
    typescript({
      tsconfig: './tsconfig.json',
      sourceMap: true,
      inlineSources: true,
    }),
    babel({
      exclude: 'node_modules/**',
      babelHelpers: 'bundled',
      presets: [['@babel/preset-env', { targets: { esmodules: true } }]],
    }),
    serve({
      contentBase: ['./dist', './tests'],
      host: '0.0.0.0',
      port: 5000,
      allowCrossOrigin: true,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    }),
  ],
};
